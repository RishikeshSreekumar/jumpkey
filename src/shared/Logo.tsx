/** Inline JumpKey mark: a key on paper. Matches public/logo.svg. */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 128 128" width={size} height={size} aria-hidden="true" className="logo">
      <rect x="4" y="4" width="120" height="120" rx="28" fill="#f6f1e6" stroke="#d8cfbd" strokeWidth="4" />
      <circle cx="44" cy="52" r="20" fill="none" stroke="#2b2622" strokeWidth="10" />
      <path d="M60 60 L96 96" stroke="#2b2622" strokeWidth="10" strokeLinecap="round" />
      <path d="M84 84 L96 72 M72 72 L82 62" stroke="#2b2622" strokeWidth="10" strokeLinecap="round" />
      <circle cx="44" cy="52" r="5" fill="#c2410c" />
    </svg>
  );
}
