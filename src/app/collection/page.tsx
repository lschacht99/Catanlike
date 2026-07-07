"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Theme } from "@/types/theme";
import { RESOURCE_KEYS_ORDERED } from "@/game/constants";
import {
  allThemes,
  CLASSIC_THEME,
  deleteCustomTheme,
  saveCustomTheme,
} from "@/game/themes";
import {
  deleteSavedBoard,
  loadSavedBoards,
  saveGameConfig,
  type SavedBoard,
} from "@/lib/storage";
import HexBoard from "@/components/HexBoard";
import ThemeEditor from "@/components/ThemeEditor";
import {
  BottomNav,
  Card,
  PrimaryButton,
  SecondaryLink,
  Shell,
  TopBar,
} from "@/components/ui";

type Tab = "themes" | "boards";

export default function CollectionPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("themes");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [boards, setBoards] = useState<SavedBoard[]>([]);
  const [editing, setEditing] = useState<Theme | null>(null);
  const [playThemeId, setPlayThemeId] = useState("classic");
  const [numPlayers, setNumPlayers] = useState(4);

  useEffect(() => {
    setThemes(allThemes());
    setBoards(loadSavedBoards());
  }, []);

  function refresh() {
    setThemes(allThemes());
    setBoards(loadSavedBoards());
    setEditing(null);
  }

  const previewTheme = themes.find((t) => t.id === playThemeId) ?? themes[0];

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
    <>
      <Shell withNav>
        <TopBar title="Collection" />

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-full border border-line bg-cream p-1 shadow-card">
          {(["themes", "boards"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full py-2 text-xs font-bold uppercase tracking-[0.2em] ${
                tab === t ? "bg-ink text-cream" : "text-ink-soft"
              }`}
            >
              {t === "themes" ? "Board themes" : "Saved boards"}
            </button>
          ))}
        </div>

        {tab === "themes" && (
          <>
            <div className="space-y-3">
              {themes.map((t) => (
                <Card key={t.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-bold uppercase tracking-wider text-ink">
                      {t.name}
                      {!t.custom && (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-widest text-ink-faint">
                          built-in
                        </span>
                      )}
                    </p>
                    <div className="flex gap-2">
                      {t.custom ? (
                        <>
                          <button
                            onClick={() => setEditing(structuredClone(t))}
                            className="rounded-full border border-line bg-parchment px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-ink"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              deleteCustomTheme(t.id);
                              refresh();
                            }}
                            aria-label={`Delete ${t.name}`}
                            className="rounded-full border border-line bg-parchment px-3 py-1.5 text-[10px]"
                          >
                            🗑️
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() =>
                            setEditing({
                              ...structuredClone(t),
                              id: `custom-${Date.now()}`,
                              name: `My ${t.name}`,
                              custom: true,
                            })
                          }
                          className="rounded-full bg-rust px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-cream"
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
                        className="flex h-10 flex-1 items-center justify-center rounded-lg border border-cream text-base"
                        style={{ background: t.resources[key].color }}
                        title={t.resources[key].label}
                      >
                        {t.resources[key].icon}
                      </span>
                    ))}
                    <span
                      className="flex h-10 flex-1 items-center justify-center rounded-lg border border-cream text-base"
                      style={{ background: t.desert.color }}
                      title={t.desert.label}
                    >
                      {t.desert.icon}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
            <PrimaryButton
              className="mt-4"
              onClick={() =>
                setEditing({
                  ...structuredClone(CLASSIC_THEME),
                  id: `custom-${Date.now()}`,
                  name: "My Theme",
                  custom: true,
                })
              }
            >
              + New custom theme
            </PrimaryButton>
            <p className="mt-3 text-center text-[10px] text-ink-faint">
              Themes only change labels, icons, and colors — never the rules.
            </p>
          </>
        )}

        {tab === "boards" && (
          <>
            {boards.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <select
                  value={playThemeId}
                  onChange={(e) => setPlayThemeId(e.target.value)}
                  className="flex-1 rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink"
                >
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <select
                  value={numPlayers}
                  onChange={(e) => setNumPlayers(Number(e.target.value))}
                  className="rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink"
                >
                  <option value={3}>3 players</option>
                  <option value={4}>4 players</option>
                </select>
              </div>
            )}
            {boards.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-3xl">🗺️</p>
                <p className="text-sm text-ink-soft">No saved boards yet.</p>
                <SecondaryLink href="/forge" className="!w-auto px-6">
                  Open Map Forge
                </SecondaryLink>
              </Card>
            ) : (
              <ul className="space-y-4">
                {boards.map((entry) => (
                  <li key={entry.id}>
                    <Card className="!p-0 overflow-hidden">
                      {previewTheme && (
                        <HexBoard
                          board={entry.board}
                          theme={previewTheme}
                          className="aspect-[4/3] w-full"
                        />
                      )}
                      <div className="flex items-center justify-between gap-2 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink">{entry.name}</p>
                          <p className="text-xs text-ink-soft">balance {entry.board.score}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => {
                              deleteSavedBoard(entry.id);
                              setBoards(loadSavedBoards());
                            }}
                            aria-label="Delete board"
                            className="rounded-full border border-line bg-parchment px-3 py-2 text-sm"
                          >
                            🗑️
                          </button>
                          <button
                            onClick={() => {
                              saveGameConfig({
                                numPlayers,
                                themeId: playThemeId,
                                board: entry.board,
                              });
                              router.push("/game");
                            }}
                            className="rounded-full bg-ink px-5 py-2 text-xs font-bold uppercase tracking-widest text-cream"
                          >
                            Play
                          </button>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Shell>
      <BottomNav active="/collection" />
    </>
  );
}
