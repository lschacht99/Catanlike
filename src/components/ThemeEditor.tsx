"use client";

import { useState } from "react";
import type { ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import { RESOURCE_KEYS_ORDERED } from "@/game/constants";
import { PrimaryButton, SecondaryButton, Shell, SectionLabel } from "./ui";

const input =
  "rounded-xl border border-line bg-parchment px-3 py-2.5 text-sm text-ink outline-none focus:border-ink/40";

/** Downscale an uploaded file to a compact data URI (localStorage-friendly). */
function fileToTileImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 256;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** Tile artwork input: paste a URL or upload a photo, with preview. */
function ImagePicker({
  value,
  onChange,
  label,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  label: string;
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-parchment text-[9px] text-ink-faint"
        style={
          value
            ? { backgroundImage: `url(${value})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        {!value && "art"}
      </span>
      <input
        value={value?.startsWith("data:") ? "(uploaded image)" : value ?? ""}
        readOnly={value?.startsWith("data:")}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="Tile image URL (optional)"
        aria-label={`${label} tile image URL`}
        className={`min-w-0 flex-1 ${input} !py-2 text-xs`}
      />
      <label className="shrink-0 cursor-pointer rounded-full border border-line bg-parchment px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-ink">
        Upload
        <input
          type="file"
          accept="image/*"
          className="hidden"
          aria-label={`${label} tile image upload`}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) onChange(await fileToTileImage(file));
            e.target.value = "";
          }}
        />
      </label>
      {value && (
        <button
          onClick={() => onChange(undefined)}
          aria-label={`Clear ${label} image`}
          className="shrink-0 rounded-full border border-line bg-parchment px-2.5 py-2 text-xs text-ink-soft"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function ThemeEditor({
  theme,
  onSave,
  onCancel,
}: {
  theme: Theme;
  onSave: (t: Theme) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Theme>(theme);

  function patchResource(
    key: ResourceKey,
    field: "label" | "color" | "icon" | "image",
    value: string | undefined,
  ) {
    setDraft((d) => ({
      ...d,
      resources: { ...d.resources, [key]: { ...d.resources[key], [field]: value } },
    }));
  }

  return (
    <Shell>
      <header className="mb-5 flex items-center gap-2">
        <button
          onClick={onCancel}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-cream text-ink shadow-card"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-sm font-bold uppercase tracking-[0.25em] text-ink">
          Edit Theme
        </h1>
        <div className="w-10" />
      </header>

      <label className="mb-4 block">
        <SectionLabel>Theme name</SectionLabel>
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className={`w-full ${input}`}
        />
      </label>

      <div className="space-y-3">
        {RESOURCE_KEYS_ORDERED.map((key) => {
          const r = draft.resources[key];
          return (
            <div key={key} className="rounded-2xl border border-line bg-cream p-3 shadow-card">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                {key} <span className="normal-case">(internal key — never changes)</span>
              </p>
              <div className="flex gap-2">
                <input
                  value={r.icon}
                  onChange={(e) => patchResource(key, "icon", e.target.value)}
                  className={`w-14 text-center text-lg ${input}`}
                  aria-label={`${key} icon`}
                />
                <input
                  value={r.label}
                  onChange={(e) => patchResource(key, "label", e.target.value)}
                  className={`flex-1 ${input}`}
                  aria-label={`${key} label`}
                />
                <input
                  type="color"
                  value={r.color}
                  onChange={(e) => patchResource(key, "color", e.target.value)}
                  className="h-11 w-12 rounded-xl border border-line bg-parchment"
                  aria-label={`${key} color`}
                />
              </div>
              <ImagePicker
                label={key}
                value={r.image}
                onChange={(v) => patchResource(key, "image", v)}
              />
            </div>
          );
        })}

        <div className="rounded-2xl border border-line bg-cream p-3 shadow-card">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-faint">desert</p>
          <div className="flex gap-2">
            <input
              value={draft.desert.icon}
              onChange={(e) => setDraft({ ...draft, desert: { ...draft.desert, icon: e.target.value } })}
              className={`w-14 text-center text-lg ${input}`}
              aria-label="desert icon"
            />
            <input
              value={draft.desert.label}
              onChange={(e) => setDraft({ ...draft, desert: { ...draft.desert, label: e.target.value } })}
              className={`flex-1 ${input}`}
              aria-label="desert label"
            />
            <input
              type="color"
              value={draft.desert.color}
              onChange={(e) => setDraft({ ...draft, desert: { ...draft.desert, color: e.target.value } })}
              className="h-11 w-12 rounded-xl border border-line bg-parchment"
              aria-label="desert color"
            />
          </div>
          <ImagePicker
            label="desert"
            value={draft.desert.image}
            onChange={(v) => setDraft({ ...draft, desert: { ...draft.desert, image: v } })}
          />
        </div>

        <div className="rounded-2xl border border-line bg-cream p-3 shadow-card">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-faint">
            bandit & building names
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={draft.bandit.label}
              onChange={(e) => setDraft({ ...draft, bandit: { ...draft.bandit, label: e.target.value } })}
              className={input}
              aria-label="bandit name"
              placeholder="Bandit name"
            />
            <input
              value={draft.bandit.icon}
              onChange={(e) => setDraft({ ...draft, bandit: { ...draft.bandit, icon: e.target.value } })}
              className={`text-center ${input}`}
              aria-label="bandit icon"
              placeholder="Icon"
            />
            <input
              value={draft.terms.road}
              onChange={(e) => setDraft({ ...draft, terms: { ...draft.terms, road: e.target.value } })}
              className={input}
              aria-label="road term"
              placeholder="Road"
            />
            <input
              value={draft.terms.settlement}
              onChange={(e) => setDraft({ ...draft, terms: { ...draft.terms, settlement: e.target.value } })}
              className={input}
              aria-label="settlement term"
              placeholder="Settlement"
            />
            <input
              value={draft.terms.city}
              onChange={(e) => setDraft({ ...draft, terms: { ...draft.terms, city: e.target.value } })}
              className={input}
              aria-label="city term"
              placeholder="City"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
        <PrimaryButton onClick={() => onSave(draft)}>Save</PrimaryButton>
      </div>
    </Shell>
  );
}
