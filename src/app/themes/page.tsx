"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import { RESOURCE_KEYS_ORDERED } from "@/game/constants";
import {
  allThemes,
  CLASSIC_THEME,
  deleteCustomTheme,
  saveCustomTheme,
} from "@/game/themes";

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [editing, setEditing] = useState<Theme | null>(null);

  useEffect(() => {
    setThemes(allThemes());
  }, []);

  function refresh() {
    setThemes(allThemes());
    setEditing(null);
  }

  function startNew(base: Theme) {
    setEditing({
      ...structuredClone(base),
      id: `custom-${Date.now()}`,
      name: `My ${base.name}`,
      custom: true,
    });
  }

  if (editing) {
    return (
      <ThemeEditor
        theme={editing}
        onSave={(t) => {
          saveCustomTheme(t);
          refresh();
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">←</Link>
        <h1 className="text-xl font-bold">Themes</h1>
      </header>

      <ul className="space-y-3">
        {themes.map((t) => (
          <li key={t.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-bold">
                {t.name}
                {!t.custom && <span className="ml-2 text-[10px] uppercase text-white/40">built-in</span>}
              </p>
              <div className="flex gap-2">
                {t.custom ? (
                  <>
                    <button
                      onClick={() => setEditing(structuredClone(t))}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        deleteCustomTheme(t.id);
                        refresh();
                      }}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-xs"
                      aria-label={`Delete ${t.name}`}
                    >
                      🗑️
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startNew(t)}
                    className="rounded-lg bg-yellow-500/90 px-3 py-1.5 text-xs font-bold text-slate-900"
                  >
                    Duplicate
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-1.5">
              {RESOURCE_KEYS_ORDERED.map((key) => (
                <span
                  key={key}
                  className="flex h-9 flex-1 items-center justify-center rounded-lg text-base"
                  style={{ background: t.resources[key].color }}
                  title={t.resources[key].label}
                >
                  {t.resources[key].icon}
                </span>
              ))}
              <span
                className="flex h-9 flex-1 items-center justify-center rounded-lg text-base"
                style={{ background: t.desert.color }}
                title={t.desert.label}
              >
                {t.desert.icon}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <button
        onClick={() => startNew(CLASSIC_THEME)}
        className="mt-4 rounded-2xl bg-yellow-500 py-3.5 font-bold text-slate-900"
      >
        + New custom theme
      </button>
      <p className="mt-3 text-center text-[11px] text-white/40">
        Themes only change labels, icons, and colors — never the rules.
      </p>
    </main>
  );
}

function ThemeEditor({
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <header className="mb-4 flex items-center gap-3">
        <button onClick={onCancel} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">←</button>
        <h1 className="text-xl font-bold">Edit Theme</h1>
      </header>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/50">
          Theme name
        </span>
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5"
        />
      </label>

      <div className="space-y-3">
        {RESOURCE_KEYS_ORDERED.map((key) => {
          const r = draft.resources[key];
          return (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
                {key} <span className="normal-case">(internal key — never changes)</span>
              </p>
              <div className="flex gap-2">
                <input
                  value={r.icon}
                  onChange={(e) => patchResource(key, "icon", e.target.value)}
                  className="w-14 rounded-xl border border-white/15 bg-slate-900 px-2 py-2.5 text-center text-lg"
                  aria-label={`${key} icon`}
                />
                <input
                  value={r.label}
                  onChange={(e) => patchResource(key, "label", e.target.value)}
                  className="flex-1 rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5"
                  aria-label={`${key} label`}
                />
                <input
                  type="color"
                  value={r.color}
                  onChange={(e) => patchResource(key, "color", e.target.value)}
                  className="h-11 w-12 rounded-xl border border-white/15 bg-slate-900"
                  aria-label={`${key} color`}
                />
              </div>
            </div>
          );
        })}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">desert</p>
          <div className="flex gap-2">
            <input
              value={draft.desert.icon}
              onChange={(e) => setDraft({ ...draft, desert: { ...draft.desert, icon: e.target.value } })}
              className="w-14 rounded-xl border border-white/15 bg-slate-900 px-2 py-2.5 text-center text-lg"
              aria-label="desert icon"
            />
            <input
              value={draft.desert.label}
              onChange={(e) => setDraft({ ...draft, desert: { ...draft.desert, label: e.target.value } })}
              className="flex-1 rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5"
              aria-label="desert label"
            />
            <input
              type="color"
              value={draft.desert.color}
              onChange={(e) => setDraft({ ...draft, desert: { ...draft.desert, color: e.target.value } })}
              className="h-11 w-12 rounded-xl border border-white/15 bg-slate-900"
              aria-label="desert color"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
            bandit & building names
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={draft.bandit.label}
              onChange={(e) => setDraft({ ...draft, bandit: { ...draft.bandit, label: e.target.value } })}
              className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5"
              aria-label="bandit name"
              placeholder="Bandit name"
            />
            <input
              value={draft.bandit.icon}
              onChange={(e) => setDraft({ ...draft, bandit: { ...draft.bandit, icon: e.target.value } })}
              className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-center"
              aria-label="bandit icon"
              placeholder="Icon"
            />
            <input
              value={draft.terms.road}
              onChange={(e) => setDraft({ ...draft, terms: { ...draft.terms, road: e.target.value } })}
              className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5"
              aria-label="road term"
              placeholder="Road"
            />
            <input
              value={draft.terms.settlement}
              onChange={(e) => setDraft({ ...draft, terms: { ...draft.terms, settlement: e.target.value } })}
              className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5"
              aria-label="settlement term"
              placeholder="Settlement"
            />
            <input
              value={draft.terms.city}
              onChange={(e) => setDraft({ ...draft, terms: { ...draft.terms, city: e.target.value } })}
              className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5"
              aria-label="city term"
              placeholder="City"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="rounded-2xl bg-white/10 py-3.5 font-bold">
          Cancel
        </button>
        <button
          onClick={() => onSave(draft)}
          className="rounded-2xl bg-yellow-500 py-3.5 font-bold text-slate-900"
        >
          Save theme
        </button>
      </div>
    </main>
  );
}
