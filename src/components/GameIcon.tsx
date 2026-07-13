import { spriteUseUrl } from "@/game/assets/assetUrl";

export default function GameIcon({
  name,
  size = 20,
  className = "",
  title,
}: {
  name: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <use href={spriteUseUrl(name)} />
    </svg>
  );
}
