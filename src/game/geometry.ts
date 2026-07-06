import type {
  BoardEdge,
  BoardGeometry,
  BoardVertex,
  Tile,
} from "@/types/game";

/** Hex radius in SVG units. Everything else derives from this. */
export const HEX_SIZE = 10;

const SQRT3 = Math.sqrt(3);

/** Axial coordinates of the standard 19-hex board (hex "radius" 2). */
export function standardBoardCoords(): { q: number; r: number }[] {
  const coords: { q: number; r: number }[] = [];
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (Math.abs(q + r) <= 2) coords.push({ q, r });
    }
  }
  return coords;
}

/** Pixel center of a pointy-top hex at axial (q, r). */
export function hexCenter(q: number, r: number): { x: number; y: number } {
  return {
    x: HEX_SIZE * SQRT3 * (q + r / 2),
    y: HEX_SIZE * 1.5 * r,
  };
}

/** The 6 corners of a pointy-top hex, starting at the top, clockwise. */
export function hexCorners(q: number, r: number): { x: number; y: number }[] {
  const c = hexCenter(q, r);
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    corners.push({
      x: c.x + HEX_SIZE * Math.cos(angle),
      y: c.y + HEX_SIZE * Math.sin(angle),
    });
  }
  return corners;
}

/** Stable id for a point, tolerant of floating point noise across hexes. */
function pointKey(x: number, y: number): string {
  return `${Math.round(x * 10)},${Math.round(y * 10)}`;
}

export function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Whether two tiles are neighbors on the hex grid. */
export function tilesAdjacent(a: Tile, b: Tile): boolean {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (
    (Math.abs(dq) <= 1 && Math.abs(dr) <= 1 && Math.abs(dq + dr) <= 1) &&
    !(dq === 0 && dr === 0)
  );
}

/** Derive vertices and edges (with adjacency) from a tile list. */
export function buildGeometry(tiles: Tile[]): BoardGeometry {
  const vertices: Record<string, BoardVertex> = {};
  const edges: Record<string, BoardEdge> = {};
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const tile of tiles) {
    const corners = hexCorners(tile.q, tile.r);
    const cornerIds = corners.map((p) => {
      const id = pointKey(p.x, p.y);
      if (!vertices[id]) {
        vertices[id] = { id, x: p.x, y: p.y, tiles: [], neighbors: [], edges: [] };
      }
      if (!vertices[id].tiles.includes(tile.id)) vertices[id].tiles.push(tile.id);
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      return id;
    });
    for (let i = 0; i < 6; i++) {
      const a = cornerIds[i];
      const b = cornerIds[(i + 1) % 6];
      const id = edgeKey(a, b);
      if (!edges[id]) edges[id] = { id, a: id.split("|")[0], b: id.split("|")[1] };
    }
  }

  for (const edge of Object.values(edges)) {
    const va = vertices[edge.a];
    const vb = vertices[edge.b];
    if (!va.neighbors.includes(edge.b)) va.neighbors.push(edge.b);
    if (!vb.neighbors.includes(edge.a)) vb.neighbors.push(edge.a);
    va.edges.push(edge.id);
    vb.edges.push(edge.id);
  }

  return { vertices, edges, bounds: { minX, minY, maxX, maxY } };
}
