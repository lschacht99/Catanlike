"use client";

import type { ReactNode } from "react";
import type { GameState, ResourceCounts, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import { BUILD_COSTS, DEV_CARD_COST, PIECE_LIMITS, type BuildableKind } from "@/game/constants";
import { canAfford, canBuyDevCard, pieceCounts } from "@/game/rules";
import Sheet from "./Sheet";
import GameIcon from "./GameIcon";

interface Pieces {
  roads: number;
  settlements: number;
  cities: number;
  knights?: number;
}

interface BuildMenuProps {
  theme: Theme;
  placeable: Record<BuildableKind, boolean>;
  onPick: (kind: BuildableKind) => void;
  G?: GameState;
  player?: string;
  onBuyDevCard?: () => void;
  onClose?: () => void;
  resources?: ResourceCounts;
  pieces?: Pieces;
  activeMode?: BuildableKind | null;
  includeKnights?: boolean;
}

function Costs({ cost, theme }: { cost: Partial<Record<ResourceKey, number>>; theme: Theme }) {
  return <span className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
    {(Object.entries(cost) as [ResourceKey, number][]).map(([key, amount]) => <span key={key} className="inline-flex items-center gap-0.5 text-xs text-ink-soft" title={theme.resources[key].label}>
      <GameIcon name={key} size={15} className="text-current"/>{amount > 1 ? `×${amount}` : ""}
    </span>)}
  </span>;
}

function SheetRow({ icon, label, sub, costs, disabled, onClick }: { icon:ReactNode; label:string; sub:string; costs:ReactNode; disabled:boolean; onClick:()=>void }) {
  return <button disabled={disabled} onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-cream p-3 text-left shadow-card transition active:scale-[.99] disabled:opacity-40">
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-parchment text-ink">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold uppercase tracking-wider text-ink">{label}</span>
      {costs}
      <span className="block text-[11px] text-ink-faint">{sub}</span>
    </span>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink-soft"><path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </button>;
}

export default function BuildMenu({
  theme,
  placeable,
  onPick,
  G,
  player,
  onBuyDevCard,
  onClose,
  resources: resourcesProp,
  pieces: piecesProp,
  activeMode = null,
  includeKnights = false,
}: BuildMenuProps) {
  const resources = resourcesProp ?? (G && player ? G.players[player].resources : undefined);
  const pieces = piecesProp ?? (G && player ? pieceCounts(G, player) : undefined);
  if (!resources || !pieces) return null;

  const freeRoads = G?.freeRoads ?? 0;
  const items: {kind:BuildableKind; label:string; used:number; max:number}[] = [
    {kind:"road",label:theme.terms.road,used:pieces.roads,max:PIECE_LIMITS.road},
    {kind:"settlement",label:theme.terms.settlement,used:pieces.settlements,max:PIECE_LIMITS.settlement},
    {kind:"city",label:theme.terms.city,used:pieces.cities,max:PIECE_LIMITS.city},
  ];
  if (includeKnights) items.push({kind:"knight",label:theme.terms.knight??"Knight",used:pieces.knights??0,max:PIECE_LIMITS.knight});

  const enabled = (kind:BuildableKind) => ((kind==="road"&&freeRoads>0)||canAfford(resources,kind))&&placeable[kind];

  if (!onClose) return <div className={`grid gap-1.5 ${items.length===4?"grid-cols-4":"grid-cols-3"}`}>
    {items.map(({kind,label,used,max})=>{
      const active=activeMode===kind;
      return <button key={kind} disabled={!enabled(kind)&&!active} onClick={()=>onPick(kind)} className={`flex min-h-[68px] flex-col items-center justify-center rounded-xl border px-1 py-2 text-sm font-semibold transition disabled:opacity-35 ${active?"border-yellow-400 bg-yellow-400/20 text-yellow-300":"border-white/15 bg-white/5 text-white"}`}>
        <GameIcon name={kind} size={22} className="mb-0.5 text-current"/>
        <span className="truncate text-[11px]">{label}</span>
        <Costs cost={BUILD_COSTS[kind]} theme={theme}/>
        <span className="text-[9px] opacity-60">{max-used} left</span>
      </button>;
    })}
  </div>;

  return <Sheet title="Build" onClose={onClose}>
    <div className="space-y-2.5">
      {items.map(({kind,label,used,max})=><SheetRow
        key={kind}
        icon={<GameIcon name={kind} size={28}/>} 
        label={label}
        sub={`${max-used} left${kind==="road"&&freeRoads>0?` · ${freeRoads} FREE`:""}`}
        costs={kind==="road"&&freeRoads>0?<span className="text-xs font-bold text-olive">Free (Road Building)</span>:<Costs cost={BUILD_COSTS[kind]} theme={theme}/>} 
        disabled={!enabled(kind)}
        onClick={()=>onPick(kind)}
      />)}
      {G&&player&&onBuyDevCard&&<SheetRow icon={<GameIcon name="dev-victory" size={28}/>} label="Journey Card" sub={`${G.devDeck.length} left in the deck`} costs={<Costs cost={DEV_CARD_COST} theme={theme}/>} disabled={!canBuyDevCard(G,player)} onClick={onBuyDevCard}/>} 
    </div>
  </Sheet>;
}
