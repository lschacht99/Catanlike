"use client";

import type { Board } from "@/types/game";
import type { Theme } from "@/types/theme";
import Board3D from "../components/Board3D";
import Dice3D from "../components/Dice3D";

export default function GameScene3D(props: { board: Board; theme: Theme; lastRoll?: [number, number] | null; rolling?: boolean }) {
  return <section className="scene3d"><Board3D board={props.board} theme={props.theme} lastRoll={props.lastRoll} /><Dice3D value={props.lastRoll ?? [1, 2]} rolling={props.rolling} /></section>;
}
