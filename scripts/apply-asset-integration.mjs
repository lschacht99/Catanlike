import { readFile, writeFile } from "node:fs/promises";

async function patch(path, transform) {
  const before = await readFile(path, "utf8");
  const after = transform(before);
  if (after === before) return false;
  await writeFile(path, after, "utf8");
  return true;
}

const changed = [];

if (await patch("src/components/GameBoardPlay.tsx", (source) => {
  if (source.includes("activeKnights={G.activeKnights}")) return source;
  const needle = "knights={G.knights} banditTile={G.banditTile}";
  if (!source.includes(needle)) throw new Error("GameBoardPlay BoardStage signature changed; patch manually.");
  return source.replace(needle, "knights={G.knights} activeKnights={G.activeKnights} knightLevels={G.knightLevels} banditTile={G.banditTile}");
})) changed.push("GameBoardPlay");

if (await patch("src/game/constants.ts", (source) => {
  if (source.includes("export const KNIGHT_MAX_LEVEL = 3;")) return source;
  if (!source.includes("export const KNIGHT_MAX_LEVEL = 2;")) throw new Error("KNIGHT_MAX_LEVEL declaration changed; patch manually.");
  return source.replace("export const KNIGHT_MAX_LEVEL = 2;", "export const KNIGHT_MAX_LEVEL = 3;");
})) changed.push("constants");

if (await patch("src/game/moves.ts", (source) => {
  if (source.includes("Mighty knights require Politics level 3")) return source;
  const before = `  if ((G.knightLevels[id] ?? 1) >= KNIGHT_MAX_LEVEL) return INVALID_MOVE;\n  if (!canPayCost(G.players[player].resources, KNIGHT_UPGRADE_COST)) return INVALID_MOVE;\n  pay(G.players[player].resources, KNIGHT_UPGRADE_COST);\n  G.knightLevels[id] = (G.knightLevels[id] ?? 1) + 1;`;
  const after = `  const currentLevel = G.knightLevels[id] ?? 1;\n  if (currentLevel >= KNIGHT_MAX_LEVEL) return INVALID_MOVE;\n  // Cities & Knights: Mighty knights require Politics level 3 (Fortress).\n  if (currentLevel === 2 && (G.players[player].improvements?.politics ?? 0) < 3) return INVALID_MOVE;\n  if (!canPayCost(G.players[player].resources, KNIGHT_UPGRADE_COST)) return INVALID_MOVE;\n  pay(G.players[player].resources, KNIGHT_UPGRADE_COST);\n  G.knightLevels[id] = currentLevel + 1;`;
  if (!source.includes(before)) throw new Error("upgradeKnight block changed; patch manually.");
  return source.replace(before, after);
})) changed.push("moves");

console.log(changed.length ? `Applied: ${changed.join(", ")}` : "Asset integration already applied.");
