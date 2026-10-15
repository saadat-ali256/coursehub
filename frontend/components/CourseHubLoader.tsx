type CSpinnerProps = {
  className?: string;
};

export function CSpinner({ className = "" }: CSpinnerProps) {
  return (
    <svg
      suppressHydrationWarning
      aria-hidden="true"
      className={`coursehub-loader__mark ${className}`}
      viewBox="0 0 64 64"
      fill="none"
    >
      <path
        suppressHydrationWarning
        d="M47.1 15.9A24 24 0 1 0 47.1 48.1"
        stroke="url(#coursehub-loader-gradient)"
        strokeWidth="8"
        strokeLinecap="round"
        className="coursehub-loader__arc"
      />
      <defs>
        <linearGradient id="coursehub-loader-gradient" x1="12" y1="12" x2="52" y2="52">
          <stop stopColor="#4f46e5" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function CourseHubLoader({
  label = "Loading...",
  fullScreen = false,
  className = "",
}: {
  label?: string;
  fullScreen?: boolean;
  className?: string;
}) {
  return (
    <div
      suppressHydrationWarning
      className={`coursehub-loader${fullScreen ? " coursehub-loader--screen" : ""}${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      aria-label={label || "Loading"}
    >
      <CSpinner />
      {label && (
        <span suppressHydrationWarning className="coursehub-loader__label">
          {label}
        </span>
      )}
    </div>
  );
}
