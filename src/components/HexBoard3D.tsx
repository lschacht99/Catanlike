"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Sky, MeshWobbleMaterial } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Object3D, Texture } from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import type { Board, Building, ResourceKey, TileResource } from "@/types/game";
import type { ResourceTheme, Theme } from "@/types/theme";
import { PLAYER_COLORS, RESOURCE_KEYS_ORDERED } from "@/game/constants";
import { buildGeometry, HEX_SIZE } from "@/game/geometry";
import { deriveHarbors } from "@/game/harbors";
import { tokenTexture } from "./board3d/tokenTexture";
import { harborTexture } from "./board3d/harborTexture";

/** Bundled tile art (or a theme's own image) resolved the same way HexBoardPlay
 *  resolves it: an absolute image URL wins, else the bundled SVG under the
 *  configured basePath — so it loads correctly both in dev and on GitHub Pages. */
function resolveArtUrl(style: ResourceTheme): string | null {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return style.image ?? (style.tileArt ? `${basePath}${style.tileArt}` : null);
}

/** Module-level texture cache so every board instance reuses the same GPU
 *  texture for a given art URL — cheap, and survives remounts. */
const tileTextureCache = new Map<string, Texture>();
const tileTexturePending = new Set<string>();

/**
 * Uploaded hex art often bakes its own hex silhouette into a square canvas
 * with a transparent margin around it (a "sticker" look) rather than
 * painting edge-to-edge. Sampled naively, that margin shows up as a visible
 * gap/border inside the tile. This scans the decoded image's alpha channel
 * once (cheap: a fixed 96x96 offscreen sample, not the full-resolution
 * image) to find the actual visible-content bounding box, then crops the
 * texture's UV sampling to it via offset/repeat — so whatever is IN the
 * image fills the hex edge-to-edge, however tight or loose its own margin
 * happens to be. A fully edge-to-edge image (no transparent margin) is
 * measured as the full [0,1] box, so this is a safe no-op for those.
 */
function cropToVisibleContent(tex: Texture): void {
  const img = tex.image as HTMLImageElement | undefined;
  if (!img || !img.width || !img.height) return;
  const S = 96;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(img, 0, 0, S, S);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, S, S).data;
  } catch {
    return; // tainted canvas (cross-origin without CORS) — skip, keep full image
  }
  let minX = S, minY = S, maxX = -1, maxY = -1;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (data[(y * S + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return; // fully transparent — nothing to crop to
  // A hair of inward padding so no faint anti-aliased fringe survives at the
  // tile edge, then convert pixel bounds to UV space (V flips: row 0 = top
  // of the source image = the texture's v=1 with the default flipY).
  const pad = 0.02;
  const u0 = Math.min(0.98, minX / S + pad);
  const u1 = Math.max(u0 + 0.01, maxX / S - pad);
  const v0 = Math.min(0.98, 1 - maxY / S + pad);
  const v1 = Math.max(v0 + 0.01, 1 - minY / S - pad);
  tex.offset.set(u0, v0);
  tex.repeat.set(u1 - u0, v1 - v0);
}

/** Loads (and caches) the distinct tile-art textures a theme needs, without
 *  Suspense: a small re-render fires once each image decodes. Missing/absent
 *  art (e.g. a color-only theme) simply yields no entry — the tile then keeps
 *  its plain colored top, no different from before this patch. */
function useTileArtTextures(urls: string[]): Record<string, Texture> {
  const [, force] = useState(0);
  useEffect(() => {
    let cancelled = false;
    for (const url of urls) {
      if (tileTextureCache.has(url) || tileTexturePending.has(url)) continue;
      tileTexturePending.add(url);
      new THREE.TextureLoader().load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          cropToVisibleContent(tex);
          tileTextureCache.set(url, tex);
          tileTexturePending.delete(url);
          if (!cancelled) force((n) => n + 1);
        },
        undefined,
        () => tileTexturePending.delete(url),
      );
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.join("|")]);
  const out: Record<string, Texture> = {};
  for (const url of urls) {
    const tex = tileTextureCache.get(url);
    if (tex) out[url] = tex;
  }
  return out;
}

/**
 * A flat, pointy-top hex fan at unit radius, lying in the XZ (ground) plane.
 * Its corners use the exact same angle formula as `hexCorners()` in
 * geometry.ts (60°·i − 90°, starting at the "north" point) — the same
 * convention every world position in this scene already derives from — so a
 * mesh built from this geometry always lines up with the tile beneath it,
 * with no dependency on how CylinderGeometry happens to UV its own cap.
 *
 * UVs map each corner to its position inside the hex's own bounding square,
 * mirroring exactly how the 2D board (HexBoard.tsx) already draws tile art:
 * a square image is placed over the hex's bounding box and clipped to the
 * hex outline. Built once and shared by every tile on every board.
 */
const HEX_CAP_GEOMETRY = (() => {
  const HALF_W = Math.sqrt(3) / 2; // half-width of a unit pointy-top hex
  const positions: number[] = [0, 0, 0];
  const uvs: number[] = [0.5, 0.5];
  for (let i = 0; i <= 6; i++) {
    const angle = (Math.PI / 180) * (60 * (i % 6) - 90);
    const x = Math.cos(angle);
    const zc = Math.sin(angle);
    positions.push(x, 0, zc);
    uvs.push(x / (2 * HALF_W) + 0.5, 0.5 - zc / 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  const indices: number[] = [];
  for (let i = 1; i <= 6; i++) indices.push(0, i, i + 1);
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
})();

/**
 * A single small tree model for wood/forest hexes only — every other terrain
 * keeps its existing primitive decor untouched. Tries TreePine.fbx, then
 * TreeRound.fbx, from the bundled MainTreesSet pack; the model is loaded and
 * normalized ONCE (module scope, real network/parse cost paid at most once
 * per session) and every tile clones just the lightweight transform node —
 * geometry and materials stay shared. If the asset is missing or fails to
 * parse, wood hexes simply keep the existing primitive cone-and-trunk tree —
 * no crash, no retry storm, no dependency on the asset being present.
 */
const TREE_ASSET_CANDIDATES = [
  "/assets/MainTreesSet_v1.1/TreePine.fbx",
  "/assets/MainTreesSet_v1.1/TreeRound.fbx",
];
/** Target world height so the model reads as "tiny", matching the primitive tree. */
const TREE_TARGET_HEIGHT = 0.34;

type TreeAssetStatus = "idle" | "loading" | "loaded" | "failed";
let treeAssetStatus: TreeAssetStatus = "idle";
let treeAssetModel: Object3D | null = null;
const treeAssetListeners = new Set<() => void>();

function notifyTreeAssetListeners(): void {
  for (const listener of treeAssetListeners) listener();
}

function loadTreeAssetOnce(basePath: string): void {
  if (treeAssetStatus !== "idle") return;
  treeAssetStatus = "loading";
  const loader = new FBXLoader();
  const tryCandidate = (i: number): void => {
    if (i >= TREE_ASSET_CANDIDATES.length) {
      treeAssetStatus = "failed";
      notifyTreeAssetListeners();
      return;
    }
    loader.load(
      `${basePath}${TREE_ASSET_CANDIDATES[i]}`,
      (model) => {
        // Normalize scale/position from the model's own raw bounding box, so
        // this works regardless of the source asset's native unit scale —
        // ground it at y=0 and center it on X/Z, same footprint as the
        // primitive tree it replaces.
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const scale = TREE_TARGET_HEIGHT / (size.y || 1);
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
          }
        });
        treeAssetModel = model;
        treeAssetStatus = "loaded";
        notifyTreeAssetListeners();
      },
      undefined,
      () => tryCandidate(i + 1),
    );
  };
  tryCandidate(0);
}

/** null = still loading/unavailable (render the primitive fallback). */
function useTreeAsset(): Object3D | null {
  const [, force] = useState(0);
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    loadTreeAssetOnce(basePath);
    const listener = () => force((n) => n + 1);
    treeAssetListeners.add(listener);
    return () => {
      treeAssetListeners.delete(listener);
    };
  }, []);
  return treeAssetStatus === "loaded" ? treeAssetModel : null;
}

/** SVG board units → world units. A hex ends up ~1 unit in radius. */
const SCALE = 0.1;
const HEX_R = HEX_SIZE * SCALE; // 1.0
const SEA_Y = 0.02;

/** Ocean + shore palette (an actual sea, not a beige disc). */
const SEA_COLOR = "#1f6f95";
const SAND_COLOR = "#d8c69b";
const SUN: [number, number, number] = [7, 8, 5];

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
  // The board's CONTENT never changes mid-game, but duo-online snapshots
  // arrive as a fresh object every time (JSON round-trip through Firebase),
  // so memoizing by object/array reference misses every single sync tick —
  // recomputing hex geometry and harbor placement on every action. A cheap
  // content-derived key (tile id/resource/token — the "board seed" in
  // spirit, since Board carries no explicit seed field) makes these real
  // cache hits across snapshots and across remounts of this component.
  const boardKey = board.tiles.map((t) => `${t.id}:${t.resource}:${t.token ?? ""}`).join("|");
  const geo = useMemo(() => {
    console.debug("[HexBoard3D] geometry recomputed (new board content)", boardKey.slice(0, 24));
    return buildGeometry(board.tiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey]);
  const treeAsset = useTreeAsset();

  // Distinct tile-art URLs this theme actually needs (a color-only theme
  // yields none, and every tile just keeps its plain colored top).
  const artUrls = useMemo(() => {
    const urls = new Set<string>();
    for (const key of RESOURCE_KEYS_ORDERED) {
      const url = resolveArtUrl(theme.resources[key]);
      if (url) urls.add(url);
    }
    const desertUrl = resolveArtUrl(theme.desert);
    if (desertUrl) urls.add(desertUrl);
    return [...urls];
  }, [theme]);
  const artTextures = useTileArtTextures(artUrls);

  // Recenter the board on the origin using its bounding box.
  const { cx, cz } = useMemo(() => {
    const { minX, minY, maxX, maxY } = geo.bounds;
    return { cx: (minX + maxX) / 2, cz: (minY + maxY) / 2 };
  }, [geo.bounds]);
  const world = useMemo(
    () => (x: number, y: number): [number, number] => [(x - cx) * SCALE, (y - cz) * SCALE],
    [cx, cz],
  );

  // Island footprint radius from the board bounds, for the sandy base under the hexes.
  const islandR = useMemo(() => {
    const { minX, minY, maxX, maxY } = geo.bounds;
    return (Math.max(maxX - minX, maxY - minY) / 2) * SCALE + HEX_R * 0.55;
  }, [geo.bounds]);

  // Harbors: the SAME per-player harbors the trade engine uses (deriveHarbors),
  // so the docks you see match the 2:1/3:1 rates you actually get. Each boat
  // carries a large badge: "3:1 ANY" or "2:1 <RESOURCE>" with the resource
  // icon, plus a tap/hover tooltip explaining the exact trade rule.
  const harbors = useMemo(() => {
    const resColor = (k: ResourceKey) => theme.resources[k]?.color ?? "#c9a24a";
    return deriveHarbors(board).map((h) => {
      const [mx, mz] = world(h.mx, h.my);
      const type = h.type;
      if (type === "generic") {
        return {
          mx,
          mz,
          label: "3:1",
          sub: "ANY",
          icon: "✳️",
          accent: "#c9a24a",
          tip: "3:1 harbor — a settlement or city on this harbor trades any 3 identical resources (or commodities) for 1 card of your choice.",
        };
      }
      const name = theme.resources[type]?.label ?? type;
      return {
        mx,
        mz,
        label: "2:1",
        sub: name.toUpperCase(),
        icon: theme.resources[type]?.icon ?? "❔",
        accent: resColor(type),
        tip: `2:1 ${name} harbor — a settlement or city here trades 2 ${name} for 1 card of your choice. This rate is for ${name} only (never commodities or other resources).`,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey, world, theme]);
  const [harborTip, setHarborTip] = useState<string | null>(null);

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
        <fog attach="fog" args={["#aecadd", 16, 30]} />
        <Sky distance={450000} sunPosition={SUN} turbidity={4} rayleigh={1.2} mieCoefficient={0.006} mieDirectionalG={0.8} />

        <hemisphereLight args={["#eaf4ff", "#6b6350", 0.7]} />
        <ambientLight intensity={0.3} />
        <directionalLight
          position={SUN}
          intensity={1.55}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
          shadow-camera-near={1}
          shadow-camera-far={30}
          shadow-bias={-0.0004}
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

        {/* Animated open sea — a wobbling plane on the GPU (cheap on mobile). */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_Y - 0.06, 0]} receiveShadow>
          <planeGeometry args={[60, 60, 48, 48]} />
          <MeshWobbleMaterial
            factor={0.16}
            speed={0.9}
            color={SEA_COLOR}
            roughness={0.35}
            metalness={0.15}
          />
        </mesh>

        {/* Sandy island base so the hexes read as land, not floating discs. */}
        <mesh position={[0, -0.14, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[islandR, islandR + 0.12, 0.34, 48]} />
          <meshStandardMaterial color={SAND_COLOR} roughness={0.98} metalness={0.02} />
        </mesh>
        {/* Shoreline foam ring where sand meets water. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_Y + 0.005, 0]}>
          <ringGeometry args={[islandR - 0.04, islandR + 0.18, 64]} />
          <meshBasicMaterial color="#e8f3fb" transparent opacity={0.5} toneMapped={false} />
        </mesh>

        {/* Harbors on the coast (docks + boats carrying trade-rate badges). */}
        {harbors.map((h, i) => (
          <Harbor
            key={i}
            mx={h.mx}
            mz={h.mz}
            label={h.label}
            accent={h.accent}
            sub={h.sub}
            icon={h.icon}
            onHover={(over) => setHarborTip(over ? h.tip : null)}
          />
        ))}

        {/* Terrain tiles. */}
        {board.tiles.map((tile) => {
          const [x, z] = world(...cornerlessCenter(tile.q, tile.r));
          const h = tileHeight(tile.resource);
          const style = tile.resource === "desert" ? theme.desert : theme.resources[tile.resource];
          const highlighted = ht.has(tile.id);
          const artUrl = resolveArtUrl(style);
          const artTexture = artUrl ? artTextures[artUrl] : undefined;
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

              {/* Uploaded SVG art, laid flat just above the cylinder's top
                  cap and clipped to the same hex the tile itself uses — never
                  a visible square. The colored cylinder underneath still
                  shows through the sides. */}
              {artTexture && (
                <mesh
                  position={[0, h + 0.006, 0]}
                  scale={[HEX_R * 0.96, 1, HEX_R * 0.96]}
                  geometry={HEX_CAP_GEOMETRY}
                  receiveShadow
                  onClick={onTileTap && highlighted ? tap(() => onTileTap(tile.id)) : undefined}
                >
                  <meshStandardMaterial
                    map={artTexture}
                    roughness={0.85}
                    metalness={0.02}
                    side={THREE.DoubleSide}
                    emissive={highlighted ? "#f59e0b" : "#000000"}
                    emissiveIntensity={highlighted ? 0.4 : 0}
                  />
                </mesh>
              )}

              {/* Number token, lying flat on the tile top. */}
              {tile.token !== null && (
                <mesh position={[0, h + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[HEX_R * 0.36, 40]} />
                  <meshBasicMaterial map={tokenTexture(tile.token)} transparent toneMapped={false} />
                </mesh>
              )}

              <Decor resource={tile.resource} seed={tile.id} top={h} treeAsset={treeAsset} />

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

      {/* Harbor tooltip: hover on desktop, press on touch (pointerover). */}
      {harborTip && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 rounded-xl border border-white/20 bg-slate-950/90 p-2 text-center text-[11px] leading-4 text-slate-100 shadow-xl">
          {harborTip}
        </div>
      )}
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
  // Bob is RELATIVE to the parent group (which already sits on the corner), so
  // the ring hugs the node instead of floating high above it.
  useFrame((state) => {
    if (!ring.current) return;
    const t = state.clock.elapsedTime * 2.4 + x + z;
    ring.current.position.y = 0.02 + Math.sin(t) * 0.02;
    const s = 1 + Math.sin(t) * 0.12;
    ring.current.scale.set(s, s, s);
  });
  return (
    <group position={[x, y + 0.04, z]} onClick={onClick}>
      {/* Large invisible tap target (steady, so taps stay easy). */}
      <mesh>
        <sphereGeometry args={[0.3, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={ring}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.13, 0.04, 10, 24]} />
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

function Harbor({
  mx,
  mz,
  label,
  accent,
  sub,
  icon,
  onHover,
}: {
  mx: number;
  mz: number;
  label: string;
  accent: string;
  sub?: string;
  icon?: string;
  onHover?: (over: boolean) => void;
}) {
  const d = Math.hypot(mx, mz) || 1;
  const nx = mx / d;
  const nz = mz / d;
  const angle = Math.atan2(nz, nx);
  // Sit just outside the coastal edge and reach out over the water (local +x = outward).
  const ox = mx + nx * 0.26;
  const oz = mz + nz * 0.26;
  return (
    <group
      position={[ox, SEA_Y, oz]}
      rotation={[0, -angle, 0]}
      onPointerOver={(e) => { e.stopPropagation(); onHover?.(true); }}
      onPointerOut={(e) => { e.stopPropagation(); onHover?.(false); }}
    >
      {/* Dock plank + mooring posts. */}
      <mesh position={[0.2, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.05, 0.22]} />
        <meshStandardMaterial color="#8a5a34" roughness={0.8} />
      </mesh>
      <mesh position={[0.42, 0.1, 0.11]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.16, 8]} />
        <meshStandardMaterial color="#5f3d22" roughness={0.8} />
      </mesh>
      <mesh position={[0.42, 0.1, -0.11]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.16, 8]} />
        <meshStandardMaterial color="#5f3d22" roughness={0.8} />
      </mesh>
      {/* Little moored boat; the sail carries the harbor's accent color. */}
      <group position={[0.64, 0.06, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.26, 0.08, 0.14]} />
          <meshStandardMaterial color="#c96a3a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.14, 0]} castShadow>
          <coneGeometry args={[0.08, 0.2, 4]} />
          <meshStandardMaterial color={accent} roughness={0.7} />
        </mesh>
      </group>
      {/* Large trade-rate badge lying flat over the dock — "3:1 ANY" or
          "2:1 <RESOURCE>" with the resource icon — readable from the
          default camera without zooming. */}
      <mesh position={[0.22, 0.15, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[0.52, 0.52]} />
        <meshBasicMaterial map={harborTexture(label, accent, sub, icon)} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

/** How many low-poly decor items each terrain scatters, and which kinds
 *  alternate (by placement index) so a tile doesn't look identical every time. */
const DECOR_PLAN: Partial<Record<TileResource, string[]>> = {
  wood: ["tree", "tree", "tree"],
  ore: ["peak", "workshop"],
  brick: ["kiln", "clayStack"],
  grain: ["crate", "sheaf", "crate"],
  wool: ["tent", "sheep"],
  desert: ["dune", "stone"],
};

interface DecorSpec {
  x: number;
  z: number;
  kind: string;
  rot: number;
  scale: number;
}

/** Cheap, deterministic scatter — same seed always yields the same layout. */
function buildDecor(resource: TileResource, seed: number): DecorSpec[] {
  const kinds = DECOR_PLAN[resource];
  if (!kinds) return [];
  return kinds.map((kind, i) => {
    const a = seeded(seed * 7 + i * 13) * Math.PI * 2;
    const rad = 0.36 + seeded(seed * 3 + i * 5) * 0.3;
    return {
      x: Math.cos(a) * rad,
      z: Math.sin(a) * rad,
      kind,
      rot: seeded(seed * 11 + i * 17) * Math.PI * 2,
      scale: 0.85 + seeded(seed * 19 + i * 23) * 0.3,
    };
  });
}

/** One decor item. No castShadow — these are small and numerous (up to
 *  19 tiles x 3), so skipping shadow-casting on them keeps mobile cheap;
 *  they still receive shadows from buildings/roads via the tile beneath. */
function DecorItem({
  kind,
  rot,
  scale,
  treeAsset,
}: {
  kind: string;
  rot: number;
  scale: number;
  treeAsset: Object3D | null;
}) {
  switch (kind) {
    case "tree":
      // A loaded tree asset clones just the (cheap) transform node — geometry
      // and materials stay shared across every instance. Falls back to the
      // primitive cone-and-trunk tree when no asset is available.
      return treeAsset ? (
        <TreeInstance model={treeAsset} rot={rot} scale={scale} />
      ) : (
        <group rotation={[0, rot, 0]} scale={scale}>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.02, 0.03, 0.12, 5]} />
            <meshStandardMaterial color="#6b4a2c" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <coneGeometry args={[0.13, 0.3, 7]} />
            <meshStandardMaterial color="#5f7a3d" roughness={0.9} />
          </mesh>
        </group>
      );
    case "peak":
      return (
        <mesh position={[0, 0.15, 0]} rotation={[0, rot, 0]} scale={scale}>
          <coneGeometry args={[0.16, 0.3, 6]} />
          <meshStandardMaterial color="#6b7280" roughness={0.95} />
        </mesh>
      );
    case "workshop":
      return (
        <group rotation={[0, rot, 0]} scale={scale}>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.22, 0.16, 0.18]} />
            <meshStandardMaterial color="#8a7452" roughness={0.6} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.19, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.06, 8]} />
            <meshStandardMaterial color="#c9a24a" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      );
    case "kiln":
      return (
        <group rotation={[0, rot, 0]} scale={scale}>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.13, 0.15, 0.18, 8]} />
            <meshStandardMaterial color="#a4552f" roughness={0.85} />
          </mesh>
          <mesh position={[0.02, 0.24, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 0.14, 6]} />
            <meshStandardMaterial color="#5c4636" roughness={0.85} />
          </mesh>
        </group>
      );
    case "clayStack":
      return (
        <group rotation={[0, rot, 0]} scale={scale}>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.2, 0.1, 0.16]} />
            <meshStandardMaterial color="#b96a4a" roughness={0.85} />
          </mesh>
          <mesh position={[0.02, 0.14, -0.01]} rotation={[0, 0.3, 0]}>
            <boxGeometry args={[0.16, 0.08, 0.13]} />
            <meshStandardMaterial color="#9c5a3f" roughness={0.85} />
          </mesh>
        </group>
      );
    case "crate":
      return (
        <mesh position={[0, 0.07, 0]} rotation={[0, rot, 0]} scale={scale}>
          <boxGeometry args={[0.16, 0.14, 0.16]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.8} />
        </mesh>
      );
    case "sheaf":
      return (
        <group rotation={[0, rot, 0]} scale={scale}>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.05, 0.06, 0.06, 8]} />
            <meshStandardMaterial color="#a4552f" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.19, 0]}>
            <coneGeometry args={[0.09, 0.28, 8]} />
            <meshStandardMaterial color="#d9b54f" roughness={0.75} />
          </mesh>
        </group>
      );
    case "tent":
      return (
        <mesh position={[0, 0.09, 0]} rotation={[0, rot, 0]} scale={scale}>
          <coneGeometry args={[0.2, 0.2, 4]} />
          <meshStandardMaterial color="#8aa67b" roughness={0.85} />
        </mesh>
      );
    case "sheep":
      return (
        <group rotation={[0, rot, 0]} scale={scale}>
          <mesh position={[0, 0.09, 0]}>
            <sphereGeometry args={[0.11, 10, 8]} />
            <meshStandardMaterial color="#f4ead2" roughness={0.95} />
          </mesh>
          <mesh position={[0.13, 0.07, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#3a2f28" roughness={0.9} />
          </mesh>
        </group>
      );
    case "dune":
      return (
        <mesh position={[0, 0.04, 0]} rotation={[0, rot, 0]} scale={[scale * 1.4, scale * 0.4, scale * 1.1]}>
          <sphereGeometry args={[0.18, 10, 8]} />
          <meshStandardMaterial color="#e3cd97" roughness={1} />
        </mesh>
      );
    case "stone":
      return (
        <group rotation={[0, rot, 0]} scale={scale}>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.12, 0.16, 0.1]} />
            <meshStandardMaterial color="#8f9aa8" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.045, 16]} />
            <meshStandardMaterial color="#c9a24a" roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

/** Clones the shared tree model's transform node once per instance (geometry
 *  and materials stay shared) — the actual "clone/cache" the asset needs. */
function TreeInstance({ model, rot, scale }: { model: Object3D; rot: number; scale: number }) {
  const clone = useMemo(() => model.clone(), [model]);
  return <primitive object={clone} rotation={[0, rot, 0]} scale={scale} />;
}

function Decor({
  resource,
  seed,
  top,
  treeAsset,
}: {
  resource: TileResource;
  seed: number;
  top: number;
  treeAsset: Object3D | null;
}) {
  const items = useMemo(() => buildDecor(resource, seed), [resource, seed]);
  return (
    <>
      {items.map((it, i) => (
        <group key={i} position={[it.x, top, it.z]}>
          <DecorItem kind={it.kind} rot={it.rot} scale={it.scale} treeAsset={resource === "wood" ? treeAsset : null} />
        </group>
      ))}
    </>
  );
}
