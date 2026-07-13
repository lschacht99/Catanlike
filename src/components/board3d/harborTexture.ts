import * as THREE from "three";

/**
 * Small sign texture for a harbor: the trade ratio ("3:1" generic or "2:1"
 * for a specific resource) over a rounded parchment plaque. Drawn on a canvas
 * so it needs no font/asset fetch (CSP-safe under GitHub Pages).
 */
const cache = new Map<string, THREE.CanvasTexture>();

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function harborTexture(label: string, accent: string, sub?: string, icon?: string): THREE.CanvasTexture {
  const key = `${label}|${accent}|${sub ?? ""}|${icon ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const S = 256;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  // Plaque — nearly full-bleed so the badge reads from a zoomed-out camera.
  roundRect(ctx, 10, 10, S - 20, S - 20, 36);
  ctx.fillStyle = "#f4ead2";
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = accent;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Resource icon (emoji) on top, big ratio in the middle, name below —
  // "3:1 ANY" or "2:1 <RESOURCE>" per the trade rules the engine enforces.
  if (icon) {
    ctx.font = "72px system-ui, sans-serif";
    ctx.fillText(icon, S / 2, 66);
  }
  ctx.fillStyle = "#22303f";
  ctx.font = "900 92px system-ui, sans-serif";
  ctx.fillText(label, S / 2, icon ? 142 : sub ? S / 2 - 24 : S / 2);
  if (sub) {
    ctx.font = "900 44px system-ui, sans-serif";
    ctx.fillStyle = accent;
    // Fit long themed names ("TERRACOTTA STOP") inside the plaque.
    const maxWidth = S - 44;
    ctx.fillText(sub, S / 2, icon ? 204 : S / 2 + 52, maxWidth);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}
