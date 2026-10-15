type CourseHubLogoProps = {
  className?: string;
  size?: "sm" | "md";
  subtitle?: string;
  light?: boolean;
};

export default function CourseHubLogo({
  className = "",
  size = "md",
  subtitle,
  light = false,
}: CourseHubLogoProps) {
  const iconSize = size === "sm" ? "h-8 w-8 rounded-lg" : "h-10 w-10 rounded-xl";
  const wordmarkSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span
      aria-label="CourseHub"
      className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center bg-indigo-600 text-white shadow-sm ${iconSize}`}
      >
        <svg viewBox="0 0 48 48" fill="none" className={size === "sm" ? "h-5 w-5" : "h-6 w-6"}>
          <path d="m4 18 20-10 20 10-20 10L4 18Z" fill="currentColor" />
          <path d="M12 23v10c6 6 18 6 24 0V23l-12 6-12-6Z" fill="currentColor" opacity=".76" />
          <path d="M44 19v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="44" cy="34" r="3" fill="currentColor" />
        </svg>
      </span>
      <span className="min-w-0 text-left">
        <span className={`block font-black tracking-[.1em] ${wordmarkSize} ${light ? "text-white" : "text-indigo-700"}`}>
          COURSEHUB
        </span>
        {subtitle && (
          <span className={`block truncate text-[9px] font-semibold tracking-[.12em] ${light ? "text-slate-300" : "text-slate-500"}`}>
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
