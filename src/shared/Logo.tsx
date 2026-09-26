// Same artwork as public/logo.svg: a keycap with a J whose stem jumps up.
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="6 6 116 116" aria-hidden="true">
      <rect x="6" y="6" width="116" height="116" rx="28" fill="#1c1917" />
      <rect x="14" y="11" width="100" height="96" rx="22" fill="#2a2521" />
      <path d="M77 36 V71 A20 20 0 0 1 37 71" fill="none" stroke="#fdfcfa" strokeWidth="13" strokeLinecap="round" />
      <path d="M58 38 L77 20 L96 38" fill="none" stroke="#e2622b" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
