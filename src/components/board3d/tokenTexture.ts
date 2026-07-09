import * as THREE from "three";
import { TOKEN_PIPS } from "@/game/constants";

/**
 * Number-token faces are drawn to an offscreen canvas and cached as textures.
 * This keeps the 3D board fully self-contained — no font or image fetches —
 * so it works under the strict GitHub-Pages CSP and offline.
 */
const cache = new Map<number, THREE.Texture>();

export function tokenTexture(token: number): THREE.Texture {
  const existing = cache.get(token);
  if (existing) return existing;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  const hot = token === 6 || token === 8;
  const ink = hot ? "#b23c1e" : "#17324d";

  // Disc + ring.
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
  ctx.fillStyle = "#fbf1dc";
  ctx.fill();
  ctx.lineWidth = size * 0.035;
  ctx.strokeStyle = "#8b6a3d";
  ctx.stroke();

  // Number.
  ctx.fillStyle = ink;
  ctx.font = `800 ${size * 0.42}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(token), cx, cy - size * 0.05);

  // Probability pips.
  const pips = TOKEN_PIPS[token] ?? 0;
  const pipR = size * 0.022;
  const gap = size * 0.06;
  const startX = cx - ((pips - 1) * gap) / 2;
  const pipY = cy + size * 0.28;
  for (let i = 0; i < pips; i++) {
    ctx.beginPath();
    ctx.arc(startX + i * gap, pipY, pipR, 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(token, texture);
  return texture;
}
