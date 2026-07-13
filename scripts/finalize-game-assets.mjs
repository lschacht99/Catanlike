import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const root = join(process.cwd(), "public", "assets", "game");
const spritePath = join(root, "sprites", "game-icons.svg");
const manifestPath = join(root, "manifest.json");

const write = async (path, content) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content.endsWith("\n") ? content : `${content}\n`, "utf8");
};

const badgeSymbol = (id, body) => `<symbol id="${id}" viewBox="0 0 80 80"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${body}</g></symbol>`;

const extraSymbols = [
  ...[1, 2, 3].map((level) => badgeSymbol(
    `knight-level-${level}`,
    `<path d="M18 18h44v25Q40 68 18 43Z"/>${Array.from({ length: level }, (_, i) => `<circle cx="${30 + i * 10}" cy="37" r="3" fill="currentColor" stroke="none"/>`).join("")}`,
  )),
  badgeSymbol("knight-active", `<path d="M18 18h44v25Q40 68 18 43Z"/><path d="M40 8v12M32 13l8 7 8-7"/><circle cx="40" cy="38" r="5" fill="#c9a24a" stroke="none"/>`),
  badgeSymbol("knight-inactive", `<path d="M18 18h44v25Q40 68 18 43Z"/><path d="M28 39h24"/>`),
  badgeSymbol("metropolis-trade", `<path d="M18 62V30l22-15 22 15v32Z"/><path d="M25 48h30M29 38h22"/>`),
  badgeSymbol("metropolis-politics", `<path d="M18 62V30l22-15 22 15v32Z"/><path d="M31 51V34h18v17M27 55h26"/>`),
  badgeSymbol("metropolis-science", `<path d="M18 62V30l22-15 22 15v32Z"/><circle cx="40" cy="43" r="10"/><path d="M40 33v20M30 43h20"/>`),
  ...["any", "wood", "brick", "grain", "wool", "ore"].map((kind, index) => badgeSymbol(
    `harbor-badge-${kind}`,
    `<path d="M12 18h56v44H12Z"/><path d="M22 51h36M25 29h30"/>${kind === "any" ? '<circle cx="40" cy="40" r="8"/>' : `<circle cx="40" cy="40" r="${5 + (index % 3)}" fill="currentColor" stroke="none"/>`}`,
  )),
];

let sprite = await readFile(spritePath, "utf8");
sprite = sprite.replace(' style="display:none"', "");
for (const symbol of extraSymbols) {
  const id = symbol.match(/id="([^"]+)"/)?.[1];
  if (id && !sprite.includes(`id="${id}"`)) sprite = sprite.replace("</defs>", `${symbol}\n</defs>`);
}
await write(spritePath, sprite);

const individualIcons = {};
const symbolPattern = /<symbol id="([^"]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g;
for (const match of sprite.matchAll(symbolPattern)) {
  const [, id, viewBox, body] = match;
  const folder = /^(?:die-|red-die-|event-)/.test(id) ? "dice" : "ui";
  const relative = `shared/${folder}/${id}.svg`;
  await write(join(root, relative), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`);
  individualIcons[id] = `/assets/game/${relative}`;
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.individualIcons = individualIcons;
manifest.counts = {
  terrain: Object.values(manifest.themes).reduce((sum, entries) => sum + Object.keys(entries).length, 0),
  materials: Object.keys(manifest.materials).length,
  spriteSymbols: Object.keys(individualIcons).length,
  standaloneIcons: Object.keys(individualIcons).length,
  cardFrames: Object.keys(manifest.cards).length,
  previews: 1,
};
manifest.counts.totalFiles = manifest.counts.terrain + manifest.counts.materials + manifest.counts.standaloneIcons + manifest.counts.cardFrames + manifest.counts.previews + 2;
await write(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`Finalized ${Object.keys(individualIcons).length} sprite symbols and standalone SVG icons.`);
