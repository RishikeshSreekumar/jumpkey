import { Bolt } from "./icons";

export function Logo({ size = 24 }: { size?: number }) {
  const radius = Math.round(size * 0.27);
  return (
    <span className="mark logo" style={{ width: size, height: size, borderRadius: radius }} aria-hidden="true">
      <Bolt size={Math.round(size * 0.58)} />
    </span>
  );
}
