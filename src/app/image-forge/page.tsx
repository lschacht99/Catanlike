"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Theme } from "@/types/theme";
import { PLAYER_NAMES } from "@/game/constants";
import { generateBoard } from "@/game/generator";
import { getTheme, saveCustomTheme } from "@/game/themes";
import { saveGameConfig } from "@/lib/storage";

export default function ImageForgePage() {
  const router = useRouter();
  const [title, setTitle] = useState("Photo Theme");
  const [preview, setPreview] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);

  const fallback = useMemo(() => getTheme("classic"), []);

  async function onFile(file: File) {
    const dataUrl = await readAsDataUrl(file);
    setPreview(dataUrl);
    const palette = await extractPalette(dataUrl);
    const themeId = `image-${Date.now()}`;
    const builtTheme: Theme = {
      id: themeId,
      name: title || file.name.replace(/\.[^.]+$/, "") || "Photo Theme",
      resources: {
        wood: { label: "Forest", color: palette[0], icon: "🌿" },
        brick: { label: "Stone", color: palette[1], icon: "🧱" },
        grain: { label: "Fields", color: palette[2], icon: "🌾" },
        wool: { label: "Meadow", color: palette[3], icon: "🐑" },
        ore: { label: "Metal", color: palette[4], icon: "⛰️" },
      },
      desert: { label: "Open Land", color: palette[5], icon: "🏜️" },
      bandit: { label: "Drifter", icon: "🧿" },
      terms: { road: "Route", settlement: "Camp", city: "Harbor", knight: "Guide" },
      board: { sea: palette[6] },
      custom: true,
    };
    setTheme(builtTheme);
    saveCustomTheme(builtTheme);
  }

  function startGame() {
    const selected = theme ?? fallback;
    saveGameConfig({
      numPlayers: 4,
      themeId: selected.id,
      board: generateBoard(450),
      playerModes: ["human", "human", "bot", "bot"],
      playerNames: ["Leah", "Moshe", PLAYER_NAMES[2], PLAYER_NAMES[3]],
      variant: "base",
    });
    router.push("/game");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/studio" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">←</Link>
        <div>
          <h1 className="text-xl font-bold">Image Forge</h1>
          <p className="text-xs text-white/55">Upload a photo and build a matching board palette from it.</p>
        </div>
      </header>

      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-white/50">Theme name</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="mb-4 rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none" placeholder="Jerusalem Sunset" />

      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/50">Upload image</label>
      <label className="mb-4 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-10 text-center text-sm text-white/65">
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        Tap to choose a photo
      </label>

      {preview && <img src={preview} alt="Preview" className="mb-4 aspect-[4/3] w-full rounded-2xl object-cover" />}

      <section className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="mb-3 text-sm font-semibold">Palette preview</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            theme?.resources.wood.color,
            theme?.resources.brick.color,
            theme?.resources.grain.color,
            theme?.resources.wool.color,
            theme?.resources.ore.color,
            theme?.desert.color,
            theme?.board.sea,
          ].filter(Boolean).map((color) => (
            <div key={color} className="h-12 rounded-xl border border-white/10" style={{ background: color as string }} />
          ))}
        </div>
        <p className="mt-3 text-xs text-white/55">Perfect for Japan, Jerusalem, travel scenes, and your own custom moodboards.</p>
      </section>

      <button onClick={startGame} disabled={!theme && !preview} className="rounded-2xl bg-yellow-500 py-3.5 font-bold text-slate-900 disabled:opacity-40">Start with this theme</button>
    </main>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function extractPalette(src: string): Promise<string[]> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const width = 32;
      const height = 32;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(["#6f8f45", "#b96a4a", "#d9b54f", "#8aa67b", "#7d7264", "#d7be92", "#17324d"]);
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      const { data } = ctx.getImageData(0, 0, width, height);
      const samples: string[] = [];
      const seen = new Set<string>();
      for (let i = 0; i < data.length; i += 16) {
        const color = toHex(data[i], data[i + 1], data[i + 2]);
        if (!seen.has(color)) {
          seen.add(color);
          samples.push(color);
        }
      }
      const palette = samples.slice(0, 7);
      while (palette.length < 7) palette.push("#4b5563");
      resolve(palette);
    };
    image.src = src;
  });
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
