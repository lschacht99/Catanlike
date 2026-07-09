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
  const [mode, setMode] = useState<"pending" | "3d" | "2d">("pending");
  useEffect(() => {
    setMode(webglAvailable() ? "3d" : "2d");
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
