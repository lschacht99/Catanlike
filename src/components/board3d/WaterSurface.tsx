"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { ShaderMaterial } from "three";
import { waterFragmentShader, waterUniforms, waterVertexShader } from "./waterShader";

export function WaterSurface({
  y,
  size = 60,
  deepColor = "#124b68",
  highlightColor = "#4f9daf",
}: {
  y: number;
  size?: number;
  deepColor?: string;
  highlightColor?: string;
}) {
  const materialRef = useRef<ShaderMaterial>(null);
  const frozen = useRef(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { frozen.current = motionQuery.matches || document.hidden; };
    update();
    motionQuery.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      motionQuery.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const uniforms = useMemo(() => waterUniforms(deepColor, highlightColor), [deepColor, highlightColor]);

  useFrame((_, delta) => {
    if (!frozen.current) uniforms.uTime.value += Math.min(delta, 0.05);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow raycast={() => {}}>
      <planeGeometry args={[size, size, 48, 48]} />
      <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={waterVertexShader} fragmentShader={waterFragmentShader} />
    </mesh>
  );
}
