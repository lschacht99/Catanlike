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

let cachedMode: "3d" | "2d" | null = null;

class BoardErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function BoardStage(props: BoardStageProps) {
  const [mode, setMode] = useState<"pending" | "3d" | "2d">(() => cachedMode ?? "pending");
  useEffect(() => {
    if (cachedMode) {
      if (mode !== cachedMode) setMode(cachedMode);
      return;
    }
    cachedMode = webglAvailable() ? "3d" : "2d";
    setMode(cachedMode);
  }, []);

  const fallback = <HexBoardPlay {...props} />;
  if (mode === "2d" || mode === "pending") return fallback;
  return <BoardErrorBoundary fallback={fallback}><HexBoard3D {...props} /></BoardErrorBoundary>;
}
