export function EclipseMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="corona" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="#A855F7" stopOpacity="0" />
          <stop offset="80%" stopColor="#A855F7" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#F5B942" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#corona)" />
      <circle cx="20" cy="20" r="11" fill="#0A0710" stroke="#A855F7" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="11" fill="none" stroke="#F5B942" strokeWidth="0.5" opacity="0.6" />
    </svg>
  );
}
