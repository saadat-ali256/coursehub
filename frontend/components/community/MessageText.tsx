type MessageTextProps = {
  text: string;
};

const URL_PATTERN =
  /(https?:\/\/[^\s]+|(?:localhost|127\.0\.0\.1)(?::\d+)(?:\/[^\s]*)?)/gi;
const URL_PART_PATTERN =
  /^(?:https?:\/\/|localhost(?::\d+)|127\.0\.0\.1(?::\d+))/i;

export function messagePreviewText(text: string) {
  return text.replace(URL_PATTERN, (value) => {
    const url = parseLocalUrl(value);
    return url ? `${url.pathname}${url.search}${url.hash}` : value;
  });
}

function parseLocalUrl(value: string) {
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `http://${value}`,
    );
    if (
      (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") ||
      (url.protocol !== "http:" && url.protocol !== "https:")
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

export default function MessageText({ text }: MessageTextProps) {
  const parts = text.split(URL_PATTERN);

  return (
    <>
      {parts.map((part, index) => {
        if (!URL_PART_PATTERN.test(part)) return <span key={index}>{part}</span>;
        const localUrl = parseLocalUrl(part);
        if (localUrl) {
          const href = `${localUrl.pathname}${localUrl.search}${localUrl.hash}`;
          return (
            <a
              key={index}
              href={href || "/"}
              className="break-all underline decoration-white/50 underline-offset-2 hover:decoration-white"
            >
              {href || "/"}
            </a>
          );
        }

        let href: string;
        try {
          const url = new URL(part);
          if (url.protocol !== "http:" && url.protocol !== "https:")
            return <span key={index}>{part}</span>;
          href = url.href;
        } catch {
          return <span key={index}>{part}</span>;
        }

        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all underline decoration-white/50 underline-offset-2 hover:decoration-white"
          >
            {part}
          </a>
        );
      })}
    </>
  );
}
