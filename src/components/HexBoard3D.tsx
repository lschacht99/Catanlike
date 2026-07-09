"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Group } from "three";
import type { Board, Building, TileResource } from "@/types/game";
import type { Theme } from "@/types/theme";
import { PLAYER_COLORS } from "@/game/constants";
import { buildGeometry, HEX_SIZE } from "@/game/geometry";
import { tokenTexture } from "./board3d/tokenTexture";

/** SVG board units → world units. A hex ends up ~1 unit in radius. */
const SCALE = 0.1;
const HEX_R = HEX_SIZE * SCALE; // 1.0
const SEA_Y = 0.12;

/** Relief height per terrain so the board reads like a little island. */
const TERRAIN_H: Record<TileResource, number> = {
  ore: 0.58,
  wood: 0.44,
  brick: 0.42,
  wool: 0.34,
  grain: 0.3,
  desert: 0.26,
};

function tileHeight(resource: TileResource): number {
  return TERRAIN_H[resource] ?? 0.3;
}

/** Cheap deterministic jitter so scattered decor is stable across renders. */
function seeded(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface HexBoard3DProps {
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

export default function HexBoard3D({
  board,
  theme,
  buildings = {},
  roads = {},
  knights = {},
  banditTile = null,
  highlightVertices = [],
  highlightEdges = [],
  highlightTiles = [],
  onVertexTap,
  onEdgeTap,
  onTileTap,
  className = "",
}: HexBoard3DProps) {
  const geo = useMemo(() => buildGeometry(board.tiles), [board.tiles]);

  // Recenter the board on the origin using its bounding box.
  const { cx, cz } = useMemo(() => {
    const { minX, minY, maxX, maxY } = geo.bounds;
    return { cx: (minX + maxX) / 2, cz: (minY + maxY) / 2 };
  }, [geo.bounds]);
  const world = useMemo(
    () => (x: number, y: number): [number, number] => [(x - cx) * SCALE, (y - cz) * SCALE],
    [cx, cz],
  );

  // Height of each vertex = tallest tile it touches, so pieces sit on the land.
  const vertexY = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of Object.values(geo.vertices)) {
      let h = SEA_Y;
      for (const t of v.tiles) {
        const tile = board.tiles.find((bt) => bt.id === t);
        if (tile) h = Math.max(h, tileHeight(tile.resource));
      }
      map[v.id] = h;
    }
    return map;
  }, [geo.vertices, board.tiles]);

  const hv = new Set(highlightVertices);
  const he = new Set(highlightEdges);
  const ht = new Set(highlightTiles);

  // Distinguish a tap from an orbit drag so rotating the board never fires a move.
  const dragRef = useRef(false);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    downRef.current = { x: e.clientX, y: e.clientY };
    dragRef.current = false;
  };
  const onMove = (e: React.PointerEvent) => {
    if (!downRef.current) return;
    const dx = e.clientX - downRef.current.x;
    const dy = e.clientY - downRef.current.y;
    if (dx * dx + dy * dy > 64) dragRef.current = true;
  };
  const tap = (fn: () => void) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!dragRef.current) fn();
  };

  return (
    <div className={`relative ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 6.6, 7.2], fov: 42 }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#0b1220"]} />
        <fog attach="fog" args={["#0b1220", 12, 22]} />

        <hemisphereLight args={["#fff6e6", "#20304a", 0.85]} />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[5, 9, 4]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-camera-near={1}
          shadow-camera-far={25}
        />

        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.12}
          minDistance={5}
          maxDistance={13}
          minPolarAngle={0.5}
          maxPolarAngle={1.15}
          target={[0, 0, 0]}
        />

        {/* Sea — a soft disc under the island. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_Y - 0.02, 0]} receiveShadow>
          <circleGeometry args={[6, 64]} />
          <meshStandardMaterial color={theme.board.sea} roughness={0.25} metalness={0.1} />
        </mesh>

        {/* Terrain tiles. */}
        {board.tiles.map((tile) => {
          const [x, z] = world(...cornerlessCenter(tile.q, tile.r));
          const h = tileHeight(tile.resource);
          const style = tile.resource === "desert" ? theme.desert : theme.resources[tile.resource];
          const highlighted = ht.has(tile.id);
          return (
            <group key={tile.id} position={[x, 0, z]}>
              <mesh
                position={[0, h / 2, 0]}
                castShadow
                receiveShadow
                onClick={onTileTap && highlighted ? tap(() => onTileTap(tile.id)) : undefined}
              >
                <cylinderGeometry args={[HEX_R * 0.965, HEX_R * 0.985, h, 6]} />
                <meshStandardMaterial
                  color={style.color}
                  roughness={0.92}
                  metalness={0.04}
                  emissive={highlighted ? "#f59e0b" : "#000000"}
                  emissiveIntensity={highlighted ? 0.4 : 0}
                />
              </mesh>

              {/* Number token, lying flat on the tile top. */}
              {tile.token !== null && (
                <mesh position={[0, h + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[HEX_R * 0.36, 40]} />
                  <meshBasicMaterial map={tokenTexture(tile.token)} transparent toneMapped={false} />
                </mesh>
              )}

              <Decor resource={tile.resource} seed={tile.id} top={h} />

              {banditTile === tile.id && <Bandit top={h} />}
            </group>
          );
        })}

        {/* Built roads. */}
        {Object.entries(roads).map(([edgeId, player]) => {
          const edge = geo.edges[edgeId];
          if (!edge) return null;
          const a = geo.vertices[edge.a];
          const b = geo.vertices[edge.b];
          const [ax, az] = world(a.x, a.y);
          const [bx, bz] = world(b.x, b.y);
          const y = Math.min(vertexY[a.id], vertexY[b.id]) + 0.02;
          return <RoadMesh key={edgeId} ax={ax} az={az} bx={bx} bz={bz} y={y} color={PLAYER_COLORS[Number(player)]} />;
        })}

        {/* Ghost roads for placeable edges. */}
        {onEdgeTap &&
          [...he].map((edgeId) => {
            const edge = geo.edges[edgeId];
            if (!edge) return null;
            const a = geo.vertices[edge.a];
            const b = geo.vertices[edge.b];
            const [ax, az] = world(a.x, a.y);
            const [bx, bz] = world(b.x, b.y);
            const y = Math.min(vertexY[a.id], vertexY[b.id]) + 0.02;
            return (
              <RoadMesh
                key={edgeId}
                ax={ax}
                az={az}
                bx={bx}
                bz={bz}
                y={y}
                color="#f59e0b"
                ghost
                onClick={tap(() => onEdgeTap(edgeId))}
              />
            );
          })}

        {/* Settlements & cities. */}
        {Object.entries(buildings).map(([vertexId, building]) => {
          const v = geo.vertices[vertexId];
          if (!v) return null;
          const [x, z] = world(v.x, v.y);
          const clickable = hv.has(vertexId) && !!onVertexTap;
          return (
            <BuildingMesh
              key={vertexId}
              x={x}
              z={z}
              y={vertexY[vertexId]}
              color={PLAYER_COLORS[Number(building.player)]}
              city={building.city}
              hasKnight={!!knights[vertexId]}
              onClick={clickable ? tap(() => onVertexTap!(vertexId)) : undefined}
            />
          );
        })}

        {/* Placeable vertex markers. */}
        {onVertexTap &&
          [...hv]
            .filter((id) => !buildings[id])
            .map((vertexId) => {
              const v = geo.vertices[vertexId];
              if (!v) return null;
              const [x, z] = world(v.x, v.y);
              return <VertexMarker key={vertexId} x={x} z={z} y={vertexY[vertexId]} onClick={tap(() => onVertexTap(vertexId))} />;
            })}
      </Canvas>
    </div>
  );
}

/** Center of a pointy-top hex in SVG units (matches geometry.hexCenter). */
function cornerlessCenter(q: number, r: number): [number, number] {
  const SQRT3 = Math.sqrt(3);
  return [HEX_SIZE * SQRT3 * (q + r / 2), HEX_SIZE * 1.5 * r];
}

function RoadMesh({
  ax,
  az,
  bx,
  bz,
  y,
  color,
  ghost = false,
  onClick,
}: {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  y: number;
  color: string;
  ghost?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) * 0.72;
  const angle = Math.atan2(dz, dx);
  return (
    <mesh position={[(ax + bx) / 2, y, (az + bz) / 2]} rotation={[0, -angle, 0]} castShadow onClick={onClick}>
      <boxGeometry args={[len, 0.09, 0.14]} />
      <meshStandardMaterial
        color={color}
        roughness={0.6}
        metalness={0.1}
        transparent={ghost}
        opacity={ghost ? 0.55 : 1}
        emissive={ghost ? "#f59e0b" : "#000000"}
        emissiveIntensity={ghost ? 0.3 : 0}
      />
    </mesh>
  );
}

function BuildingMesh({
  x,
  z,
  y,
  color,
  city,
  hasKnight,
  onClick,
}: {
  x: number;
  z: number;
  y: number;
  color: string;
  city: boolean;
  hasKnight: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <group position={[x, y, z]} onClick={onClick}>
      {city ? (
        <>
          <mesh position={[0, 0.13, 0]} castShadow>
            <boxGeometry args={[0.34, 0.26, 0.34]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.15} />
          </mesh>
          <mesh position={[0.02, 0.36, 0.02]} castShadow>
            <boxGeometry args={[0.2, 0.22, 0.2]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.15} />
          </mesh>
          <mesh position={[0.02, 0.52, 0.02]} castShadow>
            <coneGeometry args={[0.17, 0.16, 4]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.15} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.11, 0]} castShadow>
            <boxGeometry args={[0.26, 0.2, 0.26]} />
            <meshStandardMaterial color={color} roughness={0.55} metalness={0.12} />
          </mesh>
          <mesh position={[0, 0.28, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.22, 0.16, 4]} />
            <meshStandardMaterial color={color} roughness={0.55} metalness={0.12} />
          </mesh>
        </>
      )}
      {hasKnight && (
        <mesh position={[0.24, 0.24, 0.24]} castShadow>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color="#f8d66d" roughness={0.35} metalness={0.5} emissive="#7c5a06" emissiveIntensity={0.2} />
        </mesh>
      )}
    </group>
  );
}

function VertexMarker({ x, z, y, onClick }: { x: number; z: number; y: number; onClick?: (e: ThreeEvent<MouseEvent>) => void }) {
  const ring = useRef<Group>(null);
  // Gentle bob + breathing scale so valid moves read as "alive" without noise.
  useFrame((state) => {
    if (!ring.current) return;
    const t = state.clock.elapsedTime * 2.4 + x + z;
    ring.current.position.y = y + 0.16 + Math.sin(t) * 0.03;
    const s = 1 + Math.sin(t) * 0.12;
    ring.current.scale.set(s, s, s);
  });
  return (
    <group position={[x, y + 0.14, z]} onClick={onClick}>
      {/* Large invisible tap target (steady, so taps stay easy). */}
      <mesh>
        <sphereGeometry args={[0.3, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={ring}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.14, 0.04, 10, 24]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.7} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function Bandit({ top }: { top: number }) {
  return (
    <group position={[0, top, 0]}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.32, 12]} />
        <meshStandardMaterial color="#1b2431" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <sphereGeometry args={[0.11, 14, 14]} />
        <meshStandardMaterial color="#111826" roughness={0.5} metalness={0.25} />
      </mesh>
    </group>
  );
}

function Decor({ resource, seed, top }: { resource: TileResource; seed: number; top: number }) {
  const items = useMemo(() => {
    const out: { x: number; z: number; kind: "tree" | "peak" }[] = [];
    if (resource !== "wood" && resource !== "ore") return out;
    const count = resource === "wood" ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const a = seeded(seed * 7 + i * 13) * Math.PI * 2;
      const rad = 0.4 + seeded(seed * 3 + i * 5) * 0.28;
      out.push({ x: Math.cos(a) * rad, z: Math.sin(a) * rad, kind: resource === "wood" ? "tree" : "peak" });
    }
    return out;
  }, [resource, seed]);

  return (
    <>
      {items.map((it, i) =>
        it.kind === "tree" ? (
          <group key={i} position={[it.x, top, it.z]}>
            <mesh position={[0, 0.16, 0]} castShadow>
              <coneGeometry args={[0.12, 0.32, 7]} />
              <meshStandardMaterial color="#2f6d3f" roughness={0.9} />
            </mesh>
          </group>
        ) : (
          <mesh key={i} position={[it.x, top + 0.12, it.z]} castShadow>
            <coneGeometry args={[0.16, 0.3, 6]} />
            <meshStandardMaterial color="#6b7280" roughness={0.95} />
          </mesh>
        ),
      )}
    </>
  );
}
