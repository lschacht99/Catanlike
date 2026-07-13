"use client";

import type { Theme } from "@/types/theme";
import type { TileResource } from "@/types/game";

function seeded(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const PLAN: Partial<Record<TileResource, string[]>> = {
  wood: ["tree", "tree", "tree"],
  brick: ["kiln", "pottery"],
  grain: ["sheaf", "basket", "sheaf"],
  wool: ["animal", "tent"],
  ore: ["peak", "rock"],
  desert: ["dune", "scrub"],
};

export default function TerrainDecor({ resource, seed, top, theme }: { resource:TileResource; seed:number; top:number; theme:Theme }) {
  const kinds = PLAN[resource] ?? [];
  return <>
    {kinds.map((kind, i) => {
      const a = seeded(seed * 7 + i * 13) * Math.PI * 2;
      const radius = .45 + seeded(seed * 3 + i * 5) * .20;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      const rot = seeded(seed * 11 + i * 17) * Math.PI * 2;
      const scale = .78 + seeded(seed * 19 + i * 23) * .26;
      return <group key={`${seed}:${kind}:${i}`} position={[x,top+.01,z]} rotation={[0,rot,0]} scale={scale}><DecorItem kind={kind} theme={theme}/></group>;
    })}
  </>;
}

function DecorItem({ kind, theme }: { kind:string; theme:Theme }) {
  const hamsa = theme.id === "hamsa";
  const israel = theme.id === "israel";
  switch (kind) {
    case "tree":
      return hamsa || israel ? <OliveTree/> : <PineTree/>;
    case "kiln":
      return <group><mesh position={[0,.10,0]}><cylinderGeometry args={[.12,.15,.20,8]}/><meshStandardMaterial color={hamsa?"#C88B6A":"#a4552f"} roughness={.9}/></mesh><mesh position={[.03,.25,0]}><cylinderGeometry args={[.025,.035,.15,6]}/><meshStandardMaterial color="#5c4636" roughness={.9}/></mesh></group>;
    case "pottery":
      return <group>{[-.08,.03,.10].map((x,i)=><mesh key={i} position={[x,.07+Math.abs(x)*.2,(i-1)*.05]}><cylinderGeometry args={[.045,.065,.14,10]}/><meshStandardMaterial color={hamsa?"#C88B6A":"#b96a4a"} roughness={.92}/></mesh>)}</group>;
    case "sheaf":
      return <group><mesh position={[0,.04,0]}><cylinderGeometry args={[.05,.06,.08,8]}/><meshStandardMaterial color="#a4552f" roughness={.9}/></mesh><mesh position={[0,.20,0]}><coneGeometry args={[.09,.28,8]}/><meshStandardMaterial color="#d9b54f" roughness={.82}/></mesh></group>;
    case "basket":
      return <group><mesh position={[0,.07,0]}><cylinderGeometry args={[.09,.07,.14,10]}/><meshStandardMaterial color="#9a6d3b" roughness={.95}/></mesh><mesh position={[0,.14,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.09,.012,6,16,Math.PI]}/><meshStandardMaterial color="#6e4927" roughness={.95}/></mesh></group>;
    case "animal":
      return <group><mesh position={[0,.10,0]}><sphereGeometry args={[.12,9,7]}/><meshStandardMaterial color="#F6F2E7" roughness={.95}/></mesh><mesh position={[.13,.12,0]}><sphereGeometry args={[.06,8,6]}/><meshStandardMaterial color={israel?"#5d5147":"#30353b"} roughness={.9}/></mesh>{[-.07,.07].map(x=><mesh key={x} position={[x,.025,0]}><cylinderGeometry args={[.014,.014,.13,5]}/><meshStandardMaterial color="#4b4037" roughness={.9}/></mesh>)}</group>;
    case "tent":
      return <group><mesh position={[0,.11,0]}><coneGeometry args={[.17,.24,4]}/><meshStandardMaterial color={hamsa?"#F6F2E7":"#d8c7a4"} roughness={.98}/></mesh><mesh position={[0,.10,.12]}><planeGeometry args={[.10,.12]}/><meshStandardMaterial color={hamsa?"#C88B6A":"#7b5436"} side={2} roughness={.9}/></mesh></group>;
    case "peak":
      return <mesh position={[0,.16,0]}><coneGeometry args={[.18,.34,6]}/><meshStandardMaterial color={israel?"#b87047":"#6b7280"} roughness={.98}/></mesh>;
    case "rock":
      return <group>{[-.09,.04,.12].map((x,i)=><mesh key={i} position={[x,.07,(i-1)*.05]} rotation={[.1*i,.3*i,.2*i]}><dodecahedronGeometry args={[.09-i*.01,0]}/><meshStandardMaterial color={israel?"#9f6542":"#656e75"} roughness={.98}/></mesh>)}</group>;
    case "dune":
      return <mesh position={[0,.035,0]} scale={[1.8,.35,1]}><sphereGeometry args={[.16,12,6,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color={hamsa?"#DCC7A1":"#d7bd83"} roughness={1}/></mesh>;
    case "scrub":
      return <group>{[-.05,0,.05].map((x,i)=><mesh key={i} position={[x,.08,(i-1)*.03]} rotation={[0,0,(i-1)*.35]}><coneGeometry args={[.035,.16,5]}/><meshStandardMaterial color="#6f7652" roughness={.95}/></mesh>)}</group>;
    default:
      return null;
  }
}

function PineTree() {
  return <group><mesh position={[0,.07,0]}><cylinderGeometry args={[.025,.035,.14,6]}/><meshStandardMaterial color="#6b4a2c" roughness={.95}/></mesh><mesh position={[0,.24,0]}><coneGeometry args={[.14,.32,7]}/><meshStandardMaterial color="#55723f" roughness={.95}/></mesh></group>;
}

function OliveTree() {
  return <group><mesh position={[0,.09,0]}><cylinderGeometry args={[.028,.045,.18,7]}/><meshStandardMaterial color="#6b4a2c" roughness={.95}/></mesh><mesh position={[-.06,.24,0]} scale={[1.25,.75,1]}><sphereGeometry args={[.11,9,7]}/><meshStandardMaterial color="#7F8A6A" roughness={.98}/></mesh><mesh position={[.07,.25,.01]} scale={[1.2,.72,1]}><sphereGeometry args={[.11,9,7]}/><meshStandardMaterial color="#67765b" roughness={.98}/></mesh></group>;
}
