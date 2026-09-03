import type { OpenMode } from "../core";

type IconProps = { size?: number; strokeWidth?: number };

function Svg({ size = 14, strokeWidth = 2, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const Bolt = (p: IconProps) => <Svg {...p}><path d="M13 3 7 12h5l-1 9 6-9h-5l1-9Z" /></Svg>;
export const Search = (p: IconProps) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>;
export const Plus = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const Close = (p: IconProps) => <Svg {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>;
export const Check = (p: IconProps) => <Svg {...p}><path d="m5 13 4 4L19 7" /></Svg>;
export const Pencil = (p: IconProps) => <Svg {...p}><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" /></Svg>;
export const Copy = (p: IconProps) => (
  <Svg {...p}><rect x="9" y="9" width="11" height="11" rx="2.2" /><path d="M15 5.5A2.5 2.5 0 0 0 12.5 4H6a2 2 0 0 0-2 2v6.5A2.5 2.5 0 0 0 5.5 15" /></Svg>
);
export const Trash = (p: IconProps) => <Svg {...p}><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></Svg>;
export const Link = (p: IconProps) => (
  <Svg {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></Svg>
);
export const ArrowRight = (p: IconProps) => <Svg {...p}><path d="M5 12h13m0 0-5-5m5 5-5 5" /></Svg>;
export const External = (p: IconProps) => (
  <Svg {...p}><path d="M14 5h5v5M19 5l-8 8" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></Svg>
);
export const Braces = (p: IconProps) => <Svg {...p}><path d="M8 5 3 12l5 7M16 5l5 7-5 7" /></Svg>;
export const Info = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-9.5v.5" /></Svg>;
export const Gear = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10L5.6 18.4" /></Svg>
);
export const Download = (p: IconProps) => <Svg {...p}><path d="M12 4v11m0 0 4-4m-4 4-4-4" /><path d="M5 19h14" /></Svg>;
export const Upload = (p: IconProps) => <Svg {...p}><path d="M12 15V4m0 0-4 4m4-4 4 4" /><path d="M5 19h14" /></Svg>;
export const Keyboard = (p: IconProps) => (
  <Svg {...p}><rect x="2" y="6" width="20" height="13" rx="2.5" /><path d="M7 11h.01M11 11h.01M15 11h.01M8 15h8" /></Svg>
);
export const AddressBar = (p: IconProps) => <Svg {...p}><rect x="2" y="5" width="20" height="14" rx="7" /><path d="M7 12h6" /></Svg>;
export const Brackets = (p: IconProps) => (
  <Svg {...p}><path d="M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2" /><path d="M12 9v6" /></Svg>
);

/** Icon for where a Command opens. */
export function OpenModeIcon({ mode, size }: { mode: OpenMode; size?: number }) {
  return mode === "current-tab" ? <ArrowRight size={size} /> : <External size={size} />;
}

export const OPEN_MODE_LABELS: Record<OpenMode, string> = { "current-tab": "This tab", "foreground-tab": "New tab" };
