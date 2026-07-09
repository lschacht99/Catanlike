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

export function harborTexture(label: string, accent: string, sub?: string): THREE.CanvasTexture {
  const key = `${label}|${accent}|${sub ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const S = 256;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  // Plaque
  roundRect(ctx, 24, 40, S - 48, S - 80, 40);
  ctx.fillStyle = "#f4ead2";
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = accent;
  ctx.stroke();

  // Ratio text (nudged up when there's a resource sub-label under it).
  ctx.fillStyle = "#22303f";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 104px system-ui, sans-serif";
  ctx.fillText(label, S / 2, sub ? S / 2 - 22 : S / 2 + 4);

  if (sub) {
    ctx.font = "800 40px system-ui, sans-serif";
    ctx.fillStyle = accent;
    ctx.fillText(sub, S / 2, S / 2 + 52);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}
