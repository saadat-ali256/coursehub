"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import MessageText from "@/components/community/MessageText";
import CourseHubLoader from "@/components/CourseHubLoader";

type Member = {
  _id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  communityAccess?: boolean;
};

type DirectMessage = {
  _id: string;
  senderId: Member;
  text: string;
  createdAt: string;
};

function Avatar({ user }: { user: Member }) {
  const [failed, setFailed] = useState(false);
  return user.avatarUrl && !failed ? (
    <Image
      src={user.avatarUrl}
      alt={`${user.name} profile`}
      onError={() => setFailed(true)}
      className="h-10 w-10 rounded-full object-cover"
      width={40}
      height={40}
      unoptimized
    />
  ) : (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 font-black text-indigo-700">
      {user.name?.[0]?.toUpperCase() || "U"}
    </span>
  );
}

export default function PrivateConversation() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const contactId = String(params.id || "");
  const [contact, setContact] = useState<Member | null>(null);
  const [me, setMe] = useState<Member | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!contactId) return;
    const response = await fetch(
      `/api/community/direct-messages?userId=${encodeURIComponent(contactId)}`,
    );
    const data = await response.json();
    if (response.status === 403) {
      router.replace("/subscriptions");
      throw new Error("Subscription required");
    }
    if (!response.ok) throw new Error(data.message || "Could not load conversation.");
    setContact(data.contact);
    setMessages(data.messages || []);
  }, [contactId, router]);

  useEffect(() => {
    let active = true;
    let interval: number | undefined;

    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) =>
        setMe(
          data.user
            ? {
                _id: data.user.id || data.user._id,
                name: data.user.name,
                avatarUrl: data.user.avatarUrl,
                role: data.user.role,
                communityAccess: data.user.communityAccess,
              }
            : null,
        ),
      )
      .catch((cause) => console.error("Could not load signed-in user.", cause));
    // load() only updates state after its asynchronous fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
      .then(() => {
        if (!active) return;
        setLoading(false);
        interval = window.setInterval(() => {
          load().catch((cause) => {
            if (!active) return;
            setError(
              cause instanceof Error
                ? cause.message
                : "Could not refresh private messages.",
            );
            if (interval !== undefined) window.clearInterval(interval);
          });
        }, 3000);
      })
      .catch((cause) => {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load conversation.",
        );
        setLoading(false);
      });
    return () => {
      active = false;
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [load]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      const response = await fetch("/api/community/direct-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: contactId, text: message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not send message.");
      setMessages((current) => [...current, data.message]);
      setText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="coursehub-page flex min-h-screen flex-col bg-[#e9edf2] pb-14 text-slate-900 md:pb-0">
      <header className="sticky top-0 z-20 h-16 border-b bg-white shadow-sm md:h-20">
        <div className="site-navbar-inner mx-auto flex h-full w-full items-center gap-3 px-3 sm:px-5">
          <button
            onClick={() => router.push("/community/messages")}
            aria-label="Close private chat"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100"
          >
            ✕
          </button>
          {contact && <Avatar user={contact} />}
          <button
            onClick={() => router.push(`/community/profile/${encodeURIComponent(contactId)}`)}
            className="min-w-0 flex-1 text-left"
            disabled={!contact}
          >
            <b className="block truncate">{contact?.name || "Private chat"}</b>
            <span className="block truncate text-xs text-slate-500">Private conversation</span>
          </button>
          <button
            onClick={() => router.push("/community")}
            className="hidden rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold sm:block"
          >
            Community chat
          </button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <CourseHubLoader label="Loading conversation..." />
          ) : error && !contact ? (
            <p role="alert" className="pt-10 text-center text-sm text-rose-600">{error}</p>
          ) : messages.length ? (
            messages.map((message) => {
              const own = String(message.senderId?._id) === String(me?._id);
              return (
                <div key={message._id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm sm:max-w-[70%] ${
                    own
                      ? "rounded-br-md bg-indigo-600 text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                  }`}>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6"><MessageText text={message.text} /></p>
                    <time className={`mt-1 block text-right text-[10px] ${own ? "text-white/60" : "text-slate-400"}`}>
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="pt-20 text-center">
              <div className="text-4xl">👋</div>
              <b className="mt-3 block">Say hello to {contact?.name}</b>
              <p className="mt-1 text-sm text-slate-500">Only you and this member can see these messages.</p>
            </div>
          )}
        </div>
        {error && contact && (
          <p role="alert" className="px-4 pb-2 text-sm text-rose-600">{error}</p>
        )}
        {me?.communityAccess && contact ? (
          <form onSubmit={send} className="flex gap-2 border-t bg-white p-3 sm:p-4">
            <input
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                if (error) setError("");
              }}
              maxLength={2000}
              placeholder={`Message ${contact?.name || "admin"} privately…`}
              disabled={!contact || sending}
              className="h-12 min-w-0 flex-1 rounded-full bg-slate-100 px-5 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-indigo-600 text-lg text-white disabled:opacity-40"
              aria-label="Send private message"
            >
              ➤
            </button>
          </form>
        ) : me && me.role !== "admin" && contact ? (
          <p className="border-t bg-white p-4 text-center text-sm text-slate-500">
            Subscribe to a premium plan to send private messages.
          </p>
        ) : null}
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-14 grid-cols-3 border-t bg-white md:hidden">
        <button onClick={() => router.push("/community")} className="text-sm font-bold text-slate-600">Chat</button>
        <button onClick={() => router.push("/community/feed")} className="text-sm font-bold text-slate-600">Feed</button>
        <button onClick={() => router.push("/community/messages")} className="border-t-2 border-indigo-600 text-sm font-black text-indigo-700">Messages</button>
      </nav>
    </main>
  );
}
