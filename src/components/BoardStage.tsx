"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { Board, Building } from "@/types/game";
import type { Theme } from "@/types/theme";
import HexBoardPlay from "./HexBoardPlay";

export interface BoardStageProps {
  board: Board;
  theme: Theme;
  buildings?: Record<string, Building>;
  roads?: Record<string, string>;
  knights?: Record<string, string>;
  activeKnights?: Record<string, boolean>;
  knightLevels?: Record<string, number>;
  banditTile?: number | null;
  highlightVertices?: string[];
  highlightEdges?: string[];
  highlightTiles?: number[];
  onVertexTap?: (id: string) => void;
  onEdgeTap?: (id: string) => void;
  onTileTap?: (id: number) => void;
  className?: string;
}

// The 3D board is client-only (WebGL) and heavy, so it is code-split and never
// server-rendered — keeps the static export and first paint light.
const HexBoard3D = dynamic(() => import("./HexBoard3D"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-[1.4rem] bg-white/5" />,
});

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

// WebGL support never changes mid-session. Detecting it is cheap, but doing
// it via useState+useEffect means every remount of BoardStage (e.g. duo
// online, which remounts the whole board on each synced action) starts a
// fresh render at mode="pending" and briefly shows the 2D fallback/blank
// state before the effect flips it back to "3d" — the visible "black/loading
// glitch". Caching the result at module scope makes every mount AFTER the
// first start directly at the right mode, with zero flash.
let cachedMode: "3d" | "2d" | null = null;

/** Falls back to the 2D SVG board if the 3D canvas throws (lost context, etc.). */
class BoardErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function BoardStage(props: BoardStageProps) {
  // Decide 2D vs 3D only on the client, after mount, to stay export-safe.
  // A cached result (see above) skips the "pending" flash on every remount.
  const [mode, setMode] = useState<"pending" | "3d" | "2d">(() => cachedMode ?? "pending");
  useEffect(() => {
    if (cachedMode) {
      console.debug("[BoardStage] mode from cache — no black/loading flash", cachedMode);
      if (mode !== cachedMode) setMode(cachedMode);
      return;
    }
    cachedMode = webglAvailable() ? "3d" : "2d";
    console.debug("[BoardStage] mode detected (first time this session)", cachedMode);
    setMode(cachedMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fallback = <HexBoardPlay {...props} />;

  if (mode === "2d") return fallback;
  if (mode === "pending") {
    // Render the SVG board first paint; upgrade to 3D once mounted.
    return fallback;
  }
  return (
    <BoardErrorBoundary fallback={fallback}>
      <HexBoard3D {...props} />
    </BoardErrorBoundary>
  );
}
