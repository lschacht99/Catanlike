export function assetUrl(path: string, basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""): string {
  if (!path) return path;
  if (/^(?:https?:|data:|blob:)/.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!basePath) return normalized;
  const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return normalized.startsWith(`${base}/`) ? normalized : `${base}${normalized}`;
}

export function spriteUseUrl(symbol: string, basePath?: string): string {
  return `${assetUrl("/assets/game/sprites/game-icons.svg", basePath)}#${symbol}`;
}
