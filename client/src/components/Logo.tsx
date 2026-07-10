export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      className="sidebar__logo"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="23" fill="#fff" stroke="#e8a13d" strokeWidth="2" />
      {/* sol amaneciendo */}
      <circle cx="24" cy="27" r="9" fill="#e8a13d" />
      <g stroke="#e8a13d" strokeWidth="2.4" strokeLinecap="round">
        <line x1="24" y1="10" x2="24" y2="14.5" />
        <line x1="12.5" y1="15.5" x2="15.7" y2="18.7" />
        <line x1="35.5" y1="15.5" x2="32.3" y2="18.7" />
      </g>
      {/* horizonte */}
      <rect x="8" y="27" width="32" height="12" rx="2" fill="#c00000" />
      <line x1="11" y1="31.5" x2="37" y2="31.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="14" y1="35" x2="34" y2="35" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
