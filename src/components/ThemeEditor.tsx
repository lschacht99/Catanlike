"use client";

import { useState } from "react";
import type { ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import { RESOURCE_KEYS_ORDERED } from "@/game/constants";
import { PrimaryButton, SecondaryButton, Shell, SectionLabel } from "./ui";

const input =
  "rounded-xl border border-line bg-parchment px-3 py-2.5 text-sm text-ink outline-none focus:border-ink/40";

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

  function patchResource(key: ResourceKey, field: "label" | "color" | "icon", value: string) {
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
