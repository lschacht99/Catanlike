"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { Theme } from "@/types/theme";
import { harborTexture } from "../harborTexture";

export default function HarborPiece({
  mx, mz, seaY, label, sub, resource, accent, theme, onHover,
}: {
  mx:number; mz:number; seaY:number; label:string; sub:string; resource?:string; accent:string; theme:Theme; onHover?:(over:boolean)=>void;
}) {
  const d = Math.hypot(mx,mz) || 1;
  const nx = mx/d, nz = mz/d;
  const angle = Math.atan2(nz,nx);
  const ox = mx + nx*.26, oz = mz + nz*.26;
  const nomad = theme.visuals?.pieces.harbor === "nomad";
  const limestone = theme.visuals?.pieces.harbor === "limestone";
  const dock = limestone ? "#8f7b5b" : "#8a5a34";
  const hull = nomad ? "#C88B6A" : limestone ? "#b87047" : "#b85d3b";
  return <group
    position={[ox,seaY,oz]}
    rotation={[0,-angle,0]}
    onPointerOver={(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();onHover?.(true);}}
    onPointerOut={(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();onHover?.(false);}}
  >
    <mesh position={[.20,.045,0]} castShadow receiveShadow><boxGeometry args={[.54,.07,.24]}/><meshStandardMaterial color={dock} roughness={.9}/></mesh>
    {[-.11,.11].map(z=><mesh key={z} position={[.44,.12,z]} castShadow><cylinderGeometry args={[.022,.026,.20,7]}/><meshStandardMaterial color="#5f3d22" roughness={.95}/></mesh>)}
    <group position={[.69,.08,0]}>
      <mesh castShadow><boxGeometry args={[.31,.09,.16]}/><meshStandardMaterial color={hull} roughness={.82}/></mesh>
      <mesh position={[-.02,.18,0]}><cylinderGeometry args={[.012,.012,.34,6]}/><meshStandardMaterial color="#5f3d22" roughness={.9}/></mesh>
      <mesh position={[.07,.23,0]} rotation={[0,Math.PI/2,0]} castShadow><coneGeometry args={[.14,.30,3]}/><meshStandardMaterial color={nomad?"#F6F2E7":"#ece7d8"} roughness={.95} side={2}/></mesh>
      {nomad && <mesh position={[.07,.23,.006]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.045,.008,6,16]}/><meshStandardMaterial color="#1D4F8C" roughness={.65}/></mesh>}
    </group>
    <mesh position={[.20,.17,0]} rotation={[-Math.PI/2,0,Math.PI/2]}>
      <planeGeometry args={[.54,.54]}/>
      <meshBasicMaterial map={harborTexture(label,accent,sub,resource)} transparent toneMapped={false}/>
    </mesh>
  </group>;
}
