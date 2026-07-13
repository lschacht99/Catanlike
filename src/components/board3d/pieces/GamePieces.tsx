"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { Theme } from "@/types/theme";

export type PieceClick = (event: ThreeEvent<MouseEvent>) => void;
type Architecture = "classic" | "medina" | "limestone";

function architecture(theme: Theme): Architecture {
  return theme.visuals?.pieces.architecture ?? "classic";
}

function Stone({ color = "#F6F2E7" }: { color?: string }) {
  return <meshStandardMaterial color={color} roughness={0.92} metalness={0.01} />;
}

export function RoadPiece({ ax, az, bx, bz, y, color, ghost = false, onClick }: { ax:number; az:number; bx:number; bz:number; y:number; color:string; ghost?:boolean; onClick?:PieceClick }) {
  const len = Math.hypot(bx - ax, bz - az) * 0.72;
  const angle = Math.atan2(bz - az, bx - ax);
  return <group position={[(ax+bx)/2,y,(az+bz)/2]} rotation={[0,-angle,0]} onClick={onClick}>
    <mesh position={[0,.025,0]} castShadow><boxGeometry args={[len,.09,.16]}/><meshStandardMaterial color={color} roughness={.72} metalness={.04} transparent={ghost} opacity={ghost?.55:1} emissive={ghost?"#f59e0b":"#000"} emissiveIntensity={ghost?.35:0}/></mesh>
    {!ghost && <mesh position={[0,.078,0]}><boxGeometry args={[len*.92,.018,.075]}/><meshStandardMaterial color="#F6F2E7" roughness={.95} opacity={.34} transparent/></mesh>}
  </group>;
}

export function SettlementPiece({ x,z,y,color,theme,onClick }: { x:number; z:number; y:number; color:string; theme:Theme; onClick?:PieceClick }) {
  const style=architecture(theme);
  return <group position={[x,y,z]} onClick={onClick}>
    <mesh position={[0,.05,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.29,24]}/><meshBasicMaterial color="#111" transparent opacity={.22} depthWrite={false}/></mesh>
    {style==="medina"?<MedinaSettlement color={color}/>:style==="limestone"?<LimestoneSettlement color={color}/>:<ClassicSettlement color={color}/>} 
  </group>;
}

function ClassicSettlement({color}:{color:string}) { return <>
  <mesh position={[0,.13,0]} castShadow><boxGeometry args={[.30,.24,.28]}/><meshStandardMaterial color={color} roughness={.75}/></mesh>
  <mesh position={[0,.31,0]} rotation={[0,Math.PI/4,0]} castShadow><coneGeometry args={[.24,.18,4]}/><meshStandardMaterial color="#5d3c28" roughness={.9}/></mesh>
  <mesh position={[.02,.15,.145]}><boxGeometry args={[.07,.12,.018]}/><Stone/></mesh>
</>; }

function MedinaSettlement({color}:{color:string}) { return <>
  <mesh position={[0,.13,0]} castShadow><boxGeometry args={[.34,.26,.30]}/><Stone/></mesh>
  <mesh position={[.09,.29,-.02]} castShadow><boxGeometry args={[.15,.16,.18]}/><Stone/></mesh>
  <mesh position={[-.02,.14,.155]}><boxGeometry args={[.085,.14,.02]}/><meshStandardMaterial color="#8a542f" roughness={.85}/></mesh>
  <mesh position={[.10,.31,.08]}><boxGeometry args={[.055,.09,.018]}/><meshStandardMaterial color="#1D4F8C" roughness={.65}/></mesh>
  <mesh position={[0,.275,0]}><boxGeometry args={[.36,.025,.32]}/><meshStandardMaterial color={color} roughness={.65}/></mesh>
</>; }

function LimestoneSettlement({color}:{color:string}) { return <>
  <mesh position={[0,.13,0]} castShadow><boxGeometry args={[.34,.26,.30]}/><Stone color="#d8c8a5"/></mesh>
  <mesh position={[0,.285,0]} castShadow><boxGeometry args={[.28,.05,.24]}/><meshStandardMaterial color={color} roughness={.8}/></mesh>
  <mesh position={[0,.14,.155]}><boxGeometry args={[.09,.14,.02]}/><meshStandardMaterial color="#6d4c34" roughness={.9}/></mesh>
  <mesh position={[-.105,.18,.155]}><boxGeometry args={[.05,.065,.018]}/><meshStandardMaterial color="#176f8f" roughness={.65}/></mesh>
</>; }

export function CityPiece({x,z,y,color,theme,onClick}:{x:number;z:number;y:number;color:string;theme:Theme;onClick?:PieceClick}) {
  const style=architecture(theme);
  return <group position={[x,y,z]} onClick={onClick}>
    <mesh position={[0,.05,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.40,28]}/><meshBasicMaterial color="#111" transparent opacity={.24} depthWrite={false}/></mesh>
    {style==="medina"?<MedinaCity color={color}/>:style==="limestone"?<LimestoneCity color={color}/>:<ClassicCity color={color}/>} 
  </group>;
}

function ClassicCity({color}:{color:string}) { return <>
  <mesh position={[-.08,.16,0]} castShadow><boxGeometry args={[.42,.32,.36]}/><meshStandardMaterial color={color} roughness={.72}/></mesh>
  <mesh position={[.15,.31,-.02]} castShadow><cylinderGeometry args={[.13,.15,.36,6]}/><meshStandardMaterial color="#d8c7a4" roughness={.85}/></mesh>
  <mesh position={[.15,.55,-.02]} castShadow><coneGeometry args={[.17,.18,6]}/><meshStandardMaterial color="#5d3c28" roughness={.9}/></mesh>
  <mesh position={[-.08,.40,0]} rotation={[0,Math.PI/4,0]} castShadow><coneGeometry args={[.31,.20,4]}/><meshStandardMaterial color="#5d3c28" roughness={.9}/></mesh>
</>; }

function MedinaCity({color}:{color:string}) { return <>
  <mesh position={[-.06,.16,0]} castShadow><boxGeometry args={[.46,.32,.38]}/><Stone/></mesh>
  <mesh position={[.16,.39,-.05]} castShadow><boxGeometry args={[.24,.46,.25]}/><Stone/></mesh>
  <mesh position={[-.17,.36,.04]} castShadow><boxGeometry args={[.20,.20,.22]}/><Stone/></mesh>
  <mesh position={[-.06,.33,0]}><boxGeometry args={[.48,.035,.40]}/><meshStandardMaterial color={color} roughness={.65}/></mesh>
  <mesh position={[.16,.64,-.05]}><boxGeometry args={[.26,.035,.27]}/><meshStandardMaterial color={color} roughness={.65}/></mesh>
  <mesh position={[-.08,.16,.198]}><boxGeometry args={[.105,.18,.02]}/><meshStandardMaterial color="#8a542f" roughness={.88}/></mesh>
  <mesh position={[.16,.44,.081]}><boxGeometry args={[.065,.11,.018]}/><meshStandardMaterial color="#1D4F8C" roughness={.6}/></mesh>
  <mesh position={[-.31,.16,.18]} rotation={[0,0,-.45]}><boxGeometry args={[.05,.34,.12]}/><Stone/></mesh>
</>; }

function LimestoneCity({color}:{color:string}) { return <>
  <mesh position={[-.07,.17,0]} castShadow><boxGeometry args={[.48,.34,.38]}/><Stone color="#d8c8a5"/></mesh>
  <mesh position={[.16,.37,-.03]} castShadow><cylinderGeometry args={[.14,.16,.45,8]}/><Stone color="#cdbb94"/></mesh>
  <mesh position={[.16,.61,-.03]} castShadow><cylinderGeometry args={[.17,.17,.05,8]}/><meshStandardMaterial color={color} roughness={.7}/></mesh>
  <mesh position={[-.07,.36,0]}><boxGeometry args={[.50,.035,.40]}/><meshStandardMaterial color={color} roughness={.7}/></mesh>
  <mesh position={[-.07,.17,.20]}><boxGeometry args={[.11,.19,.02]}/><meshStandardMaterial color="#6d4c34" roughness={.9}/></mesh>
</>; }

export function KnightPiece({x,z,y,color,level=1,active=false,theme,onClick}:{x:number;z:number;y:number;color:string;level?:number;active?:boolean;theme:Theme;onClick?:PieceClick}) {
  const rank=Math.max(1,Math.min(3,level));
  const scale=.78+rank*.12;
  const body=active?color:"#756f66";
  const shieldRot=active?-.18:.62;
  const pose=active?0:-.22;
  return <group position={[x,y+.02,z]} scale={scale} rotation={[0,pose,0]} onClick={onClick}>
    <mesh position={[0,.035,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.22,.025,8,24]}/><meshStandardMaterial color={active?"#c9a24a":"#4b4b47"} emissive={active?"#6d4f13":"#000"} emissiveIntensity={active?.35:0} roughness={.55}/></mesh>
    <mesh position={[0,.19,0]} castShadow><cylinderGeometry args={[.10,.13,.30,8]}/><meshStandardMaterial color={body} roughness={.72}/></mesh>
    <mesh position={[0,.41,0]} castShadow><sphereGeometry args={[.105,12,10]}/><meshStandardMaterial color="#d8b08a" roughness={.82}/></mesh>
    <mesh position={[0,.50,0]} castShadow><coneGeometry args={[.13,.13,8]}/><meshStandardMaterial color={rank===3?"#c9a24a":"#4c5154"} metalness={.25} roughness={.55}/></mesh>
    <group position={[.12,.24,.08]} rotation={[0,0,shieldRot]}>
      <mesh castShadow rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.13,.13,.035,8]}/><meshStandardMaterial color="#F6F2E7" roughness={.75}/></mesh>
      {Array.from({length:rank}).map((_,i)=><mesh key={i} position={[-.045+i*.045,.019,.035]}><boxGeometry args={[.018,.016,.08]}/><meshStandardMaterial color={color} roughness={.55}/></mesh>)}
    </group>
    <mesh position={[-.10,.28,0]} rotation={[0,0,active?.08:.45]} castShadow><cylinderGeometry args={[.018,.018,.46,6]}/><meshStandardMaterial color="#6b4a2c" roughness={.9}/></mesh>
    {rank===3&&<mesh position={[0,.30,-.08]} rotation={[.18,0,0]}><planeGeometry args={[.28,.34]}/><meshStandardMaterial color={theme.visuals?.pieces.knight==="scout"?"#C88B6A":color} side={2} roughness={.85}/></mesh>}
  </group>;
}

export function BanditPiece({x,z,y,theme}:{x:number;z:number;y:number;theme:Theme}) {
  const hamsa=theme.id==="hamsa";
  return <group position={[x,y,z]}>
    <mesh position={[0,.18,0]} castShadow><cylinderGeometry args={[.13,.18,.36,10]}/><meshStandardMaterial color={hamsa?"#5e4639":"#202833"} roughness={.78}/></mesh>
    <mesh position={[0,.42,0]} castShadow><sphereGeometry args={[.12,12,10]}/><meshStandardMaterial color={hamsa?"#8a6a55":"#111826"} roughness={.72}/></mesh>
    <mesh position={[0,.50,0]} rotation={[0,0,.08]} castShadow><coneGeometry args={[.17,.10,8]}/><meshStandardMaterial color="#111" roughness={.82}/></mesh>
    {hamsa&&<mesh position={[.13,.16,.03]} rotation={[0,0,.25]}><boxGeometry args={[.16,.22,.07]}/><meshStandardMaterial color="#C88B6A" roughness={.85}/></mesh>}
  </group>;
}
