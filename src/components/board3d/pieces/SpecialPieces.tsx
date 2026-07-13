"use client";

import type { Theme } from "@/types/theme";

export function BarbarianShip({ theme }: { theme:Theme }) {
  const sail=theme.id==="hamsa"?"#F6F2E7":"#d8d2c4";
  return <group>
    <mesh position={[0,.08,0]} castShadow><boxGeometry args={[.62,.14,.25]}/><meshStandardMaterial color="#382d29" roughness={.88}/></mesh>
    <mesh position={[0,.35,0]}><cylinderGeometry args={[.018,.022,.56,7]}/><meshStandardMaterial color="#5f3d22" roughness={.9}/></mesh>
    <mesh position={[.13,.40,0]} rotation={[0,Math.PI/2,0]}><coneGeometry args={[.23,.46,3]}/><meshStandardMaterial color={sail} side={2} roughness={.95}/></mesh>
    <mesh position={[-.15,.12,0]}><coneGeometry args={[.11,.27,5]}/><meshStandardMaterial color="#1b2431" roughness={.82}/></mesh>
  </group>;
}

export function MerchantPiece({ color="#c9a24a" }: { color?:string }) {
  return <group>
    <mesh position={[0,.18,0]} castShadow><cylinderGeometry args={[.10,.14,.36,9]}/><meshStandardMaterial color={color} roughness={.78}/></mesh>
    <mesh position={[0,.42,0]} castShadow><sphereGeometry args={[.10,11,9]}/><meshStandardMaterial color="#d8b08a" roughness={.85}/></mesh>
    <mesh position={[.13,.18,.02]} rotation={[0,0,.25]}><sphereGeometry args={[.12,9,7]}/><meshStandardMaterial color="#8a5a34" roughness={.95}/></mesh>
    <mesh position={[0,.51,0]}><cylinderGeometry args={[.14,.17,.06,10]}/><meshStandardMaterial color="#7F8A6A" roughness={.85}/></mesh>
  </group>;
}

export function CityWallPiece({ color="#d8c8a5" }: { color?:string }) {
  return <group>
    <mesh position={[0,.12,0]} castShadow><boxGeometry args={[.65,.24,.12]}/><meshStandardMaterial color={color} roughness={.95}/></mesh>
    {[-.25,0,.25].map((x)=><mesh key={x} position={[x,.29,0]} castShadow><boxGeometry args={[.12,.14,.15]}/><meshStandardMaterial color={color} roughness={.95}/></mesh>)}
  </group>;
}

export function MetropolisPiece({ track, color }: { track:"trade"|"politics"|"science"; color:string }) {
  const accent=track==="trade"?"#7F8A6A":track==="politics"?"#C88B6A":"#1D4F8C";
  return <group>
    <mesh position={[0,.18,0]} castShadow><cylinderGeometry args={[.25,.30,.36,8]}/><meshStandardMaterial color={color} roughness={.78}/></mesh>
    <mesh position={[0,.46,0]} castShadow><cylinderGeometry args={[.15,.20,.28,8]}/><meshStandardMaterial color="#F6F2E7" roughness={.94}/></mesh>
    <mesh position={[0,.65,0]} castShadow><coneGeometry args={[.19,.18,8]}/><meshStandardMaterial color={accent} roughness={.72} metalness={.08}/></mesh>
    {[0,1,2].map((i)=><mesh key={i} position={[-.12+i*.12,.45,.155]}><boxGeometry args={[.045,.09,.018]}/><meshStandardMaterial color={accent} roughness={.6}/></mesh>)}
  </group>;
}
