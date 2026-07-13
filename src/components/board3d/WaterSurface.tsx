"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { ShaderMaterial } from "three";
import { waterFragmentShader, waterUniforms, waterVertexShader } from "./waterShader";

/**
 * The open-sea plane, animated entirely on the GPU: a time uniform advances
 * in useFrame (R3F's own per-frame hook — never React state, never an
 * interval, never a re-render) and the vertex/fragment shaders do the rest.
 * Two independent, no-rerender switches freeze uTime instead of animating
 * it: `prefers-reduced-motion` (checked once, and re-checked live in case it
 * changes mid-session) for the "static texture" requirement, and the tab's
 * `visibilitychange` state so a backgrounded/minimized tab does no GPU work.
 * Never intersects raycasts (`raycast={() => null}`) — the board's own
 * tile/vertex/edge meshes own every tap, so this is the 3D-scene equivalent
 * of `pointer-events: none`.
 */
export function WaterSurface({ y, size = 60 }: { y: number; size?: number }) {
  const materialRef = useRef<ShaderMaterial>(null);
  const frozen = useRef(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      frozen.current = motionQuery.matches || document.hidden;
    };
    update();
    motionQuery.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      motionQuery.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const uniforms = useMemo(() => waterUniforms(), []);

  useFrame((_, delta) => {
    if (frozen.current) return;
    uniforms.uTime.value += delta;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow raycast={() => {}}>
      <planeGeometry args={[size, size, 48, 48]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
      />
    </mesh>
  );
}
