import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const root = join(process.cwd(), "public", "assets", "game");
const write = async (rel, body) => {
  const path = join(root, rel);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body.endsWith("\n") ? body : `${body}\n`, "utf8");
};

const paperFilter = `
<filter id="paper" x="-10%" y="-10%" width="120%" height="120%">
  <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="19" result="n"/>
  <feColorMatrix in="n" type="saturate" values="0" result="g"/>
  <feComponentTransfer in="g" result="a"><feFuncA type="table" tableValues="0 .11"/></feComponentTransfer>
  <feBlend in="SourceGraphic" in2="a" mode="multiply"/>
</filter>`;

const themeData = {
  classic: {
    label: "Classic Isles",
    palette: { cream: "#f5ead2", ink: "#24313b", blue: "#246b8e", sand: "#d7bd83", clay: "#b75f3d", olive: "#55723f", stone: "#6d7880", gold: "#d2a93f" },
  },
  hamsa: {
    label: "Hamsa Nomads",
    palette: { cream: "#F6F2E7", ink: "#111111", blue: "#1D4F8C", sand: "#DCC7A1", clay: "#C88B6A", olive: "#7F8A6A", stone: "#756f66", gold: "#c9a24a" },
  },
  israel: {
    label: "Israel Landscape",
    palette: { cream: "#f2eadb", ink: "#2f2b26", blue: "#176f8f", sand: "#d4b27b", clay: "#b87047", olive: "#708353", stone: "#bda983", gold: "#d1a342" },
  },
};

const hexHeader = (p, title, base) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="${title}">
<defs>${paperFilter}
<linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.cream}"/><stop offset="1" stop-color="${base}"/></linearGradient>
<linearGradient id="sun" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".55"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<rect width="512" height="512" fill="url(#sky)"/>
<rect width="512" height="512" fill="url(#sun)"/>
<g filter="url(#paper)">`;
const endSvg = `</g></svg>`;

function terrainSvg(theme, kind) {
  const { palette: p, label } = themeData[theme];
  const title = `${label} ${kind}`;
  const base = {
    wood: p.olive, brick: p.clay, grain: p.gold, wool: "#91a978", ore: p.stone, desert: p.sand, sea: p.blue,
  }[kind];
  let body = "";
  if (kind === "wood") {
    const olive = theme !== "classic";
    body += `<path d="M0 355 C90 292 170 331 257 278 C337 229 424 257 512 196 V512 H0Z" fill="${p.olive}" opacity=".78"/>`;
    for (let i = 0; i < 13; i++) {
      const x = 28 + (i * 83) % 470, y = 150 + (i * 59) % 300, s = 16 + (i % 4) * 4;
      body += olive
        ? `<g transform="translate(${x} ${y})"><path d="M0 38V8" stroke="#6b4b2f" stroke-width="7" stroke-linecap="round"/><ellipse cx="-13" cy="6" rx="${s}" ry="${Math.round(s*.65)}" fill="${p.olive}"/><ellipse cx="14" cy="-2" rx="${s}" ry="${Math.round(s*.65)}" fill="#667557"/><circle cx="-9" cy="5" r="3" fill="#343d26"/><circle cx="12" cy="-1" r="3" fill="#343d26"/></g>`
        : `<g transform="translate(${x} ${y})"><path d="M0 40V10" stroke="#6b4b2f" stroke-width="7"/><path d="M-26 20L0-38L26 20Z" fill="#46653a"/><path d="M-22 1L0-48L22 1Z" fill="#5f7f4e"/></g>`;
    }
    body += `<path d="M35 430 C140 366 210 397 306 345 C389 300 443 311 495 273" fill="none" stroke="${p.cream}" stroke-width="9" stroke-dasharray="18 16" opacity=".75"/>`;
  } else if (kind === "brick") {
    body += `<path d="M0 355 C120 285 210 340 322 276 C405 228 455 232 512 211 V512H0Z" fill="${p.clay}" opacity=".84"/>`;
    for (let i = 0; i < 16; i++) { const x=20+(i*91)%480,y=270+(i*47)%210; body += `<rect x="${x}" y="${y}" width="52" height="24" rx="4" fill="${i%2?p.clay:'#a85f42'}" stroke="${p.cream}" stroke-opacity=".35" transform="rotate(${(i%3-1)*7} ${x+26} ${y+12})"/>`; }
    body += theme === "hamsa" ? `<g transform="translate(337 135)"><path d="M0 108V18h105v90" fill="${p.cream}" stroke="${p.ink}" stroke-width="5"/><path d="M20 108V58q32-34 64 0v50" fill="${p.clay}"/><circle cx="84" cy="38" r="9" fill="${p.blue}"/></g>` : `<path d="M80 245L166 142l92 103Z" fill="#9a5d45" opacity=".65"/>`;
  } else if (kind === "grain") {
    body += `<path d="M0 250 C120 210 199 245 299 205 C390 169 452 190 512 164V512H0Z" fill="${p.gold}" opacity=".82"/>`;
    for(let i=0;i<25;i++){const x=18+(i*61)%490,y=238+(i*83)%255;body+=`<g transform="translate(${x} ${y}) rotate(${i%2?8:-8})"><path d="M0 52V0" stroke="#80642b" stroke-width="4"/><path d="M0 8l-12 8M0 18l12 8M0 28l-12 8" stroke="#f2d06c" stroke-width="7" stroke-linecap="round"/></g>`;}
    if(theme!=="classic") body += `<path d="M20 382 C145 326 219 365 330 309 C409 270 467 277 507 254" fill="none" stroke="${p.cream}" stroke-width="7" stroke-dasharray="16 15" opacity=".65"/>`;
  } else if (kind === "wool") {
    body += `<path d="M0 300 C98 235 177 272 269 226 C350 185 432 218 512 174V512H0Z" fill="#81986d" opacity=".82"/>`;
    for(let i=0;i<8;i++){const x=45+(i*107)%430,y=260+(i*71)%210;body+=`<g transform="translate(${x} ${y})"><g fill="${p.cream}" stroke="${p.ink}" stroke-width="3"><circle cx="-16" cy="0" r="14"/><circle cx="0" cy="-5" r="17"/><circle cx="18" cy="1" r="14"/></g><circle cx="33" cy="2" r="9" fill="${theme==='israel'?'#5d5147':'#30353b'}"/><path d="M-11 12v20M14 12v20" stroke="${p.ink}" stroke-width="4"/></g>`;}
    if(theme==='hamsa') body += `<path d="M325 235l65-91 65 91Z" fill="${p.cream}" stroke="${p.clay}" stroke-width="6"/><path d="M390 144v91" stroke="${p.ink}" stroke-width="4"/>`;
  } else if (kind === "ore") {
    body += `<path d="M0 370L84 251l66 53 102-172 73 94 67-73 120 179V512H0Z" fill="${p.stone}" opacity=".9"/>`;
    body += `<path d="M84 251l66 53 102-172 73 94" fill="none" stroke="${p.cream}" stroke-opacity=".45" stroke-width="13"/>`;
    for(let i=0;i<10;i++){const x=30+(i*113)%470,y=330+(i*61)%160;body+=`<polygon points="${x},${y} ${x+28},${y-32} ${x+57},${y+3} ${x+35},${y+30}" fill="${theme==='israel'?p.clay:'#5f6770'}" stroke="${p.cream}" stroke-opacity=".35" stroke-width="4"/>`;}
    if(theme==='hamsa') body += `<g transform="translate(385 104)" fill="none" stroke="${p.gold}" stroke-width="8"><circle r="58"/><path d="M0-48V48M-48 0H48M-34-34L34 34M34-34L-34 34"/></g>`;
  } else if (kind === "desert") {
    body += `<path d="M0 260 C98 194 177 250 278 199 C368 154 425 194 512 150V512H0Z" fill="${p.sand}" opacity=".9"/>`;
    body += `<path d="M0 386 C130 319 230 386 339 324 C412 283 460 307 512 278" fill="none" stroke="${p.cream}" stroke-width="18" opacity=".55"/>`;
    body += `<path d="M35 176 C139 130 220 162 311 119 C384 84 451 101 496 75" fill="none" stroke="${p.clay}" stroke-width="6" stroke-dasharray="16 17" opacity=".55"/>`;
    if(theme==='hamsa') body += `<g transform="translate(340 235) rotate(-8)"><rect width="125" height="84" rx="12" fill="${p.cream}" stroke="${p.ink}" stroke-width="5"/><circle cx="63" cy="42" r="25" fill="none" stroke="${p.clay}" stroke-width="5" stroke-dasharray="8 7"/><path d="M25 18h75M28 66h69" stroke="${p.ink}" stroke-width="4" opacity=".6"/></g>`;
    if(theme==='israel') body += `<g fill="#6f7652"><path d="M102 350c30-70 52-70 75 0-25-18-50-18-75 0Z"/><path d="M380 410c23-55 42-55 61 0-20-14-40-14-61 0Z"/></g>`;
  } else if (kind === "sea") {
    body += `<rect width="512" height="512" fill="${p.blue}"/><path d="M-30 92 C75 44 148 131 245 82 C342 33 417 112 548 54M-25 225 C79 173 167 264 270 213 C371 163 446 239 552 190M-35 365 C73 317 157 401 264 350 C367 301 454 375 551 330" fill="none" stroke="#a8d9dc" stroke-width="15" stroke-linecap="round" opacity=".43"/><path d="M-25 160 C67 116 135 184 231 143 C329 101 405 172 540 113M-20 300 C73 258 160 327 252 285 C348 241 430 307 540 260" fill="none" stroke="${p.cream}" stroke-width="6" opacity=".36"/>`;
  }
  return `${hexHeader(p, title, base)}${body}${endSvg}`;
}

const iconIds = [
  "wood","brick","grain","wool","ore","paper","coin","cloth","trade","politics","science",
  "road","settlement","city","knight","activate-knight","deactivate-knight","upgrade-knight","bank-trade","harbor","bandit","barbarian","merchant","city-wall","metropolis",
  "harbor-any","harbor-wood","harbor-brick","harbor-grain","harbor-wool","harbor-ore",
  "dev-knight","dev-victory","dev-road-building","dev-year-of-plenty","dev-monopoly",
  "progress-harvest","progress-merchant","progress-caravan","progress-market-day","progress-diplomat","progress-warlord","progress-intrigue","progress-levy","progress-roadworks","progress-invention","progress-ore-rush","progress-scholar",
  "longest-road","largest-defense","victory-point","current-player","online-player","bot","disconnected","loading","valid-placement","invalid-placement","selected-piece"
];

function iconBody(id, i) {
  const n = i % 6;
  const marks = [
    `<path d="M18 45C28 17 40 14 50 45M32 45C41 20 52 18 60 45"/>`,
    `<path d="M18 48h44V24H18zM18 36h44M32 24v24M48 24v24"/>`,
    `<path d="M40 15v50M40 24l-14 10M40 34l15 10M40 44L25 55"/>`,
    `<circle cx="40" cy="40" r="22"/><path d="M40 18v44M18 40h44"/>`,
    `<path d="M15 55L31 24l12 18 10-14 14 27z"/>`,
    `<path d="M19 55V32l21-15 21 15v23zM31 55V39h18v16"/>`,
  ];
  const badge = id.includes("activate") ? `<circle cx="61" cy="19" r="8" fill="#c9a24a" stroke="none"/>` : id.includes("deactivate") ? `<path d="M55 19h13"/>` : id.includes("upgrade") ? `<path d="M58 25V10M50 18h16"/>` : "";
  return `${marks[n]}${badge}`;
}

const symbols = iconIds.map((id, i) => `<symbol id="${id}" viewBox="0 0 80 80"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${iconBody(id, i)}</g></symbol>`).join("\n");
const diceSymbols = Array.from({length:6},(_,i)=>`<symbol id="die-${i+1}" viewBox="0 0 80 80"><rect x="9" y="9" width="62" height="62" rx="13" fill="#F6F2E7" stroke="currentColor" stroke-width="5"/><text x="40" y="52" text-anchor="middle" font-size="35" font-family="Montserrat,Arial" font-weight="800" fill="currentColor">${i+1}</text></symbol>`).join("\n");
const redDice = Array.from({length:6},(_,i)=>`<symbol id="red-die-${i+1}" viewBox="0 0 80 80"><rect x="9" y="9" width="62" height="62" rx="13" fill="#C88B6A" stroke="#111" stroke-width="5"/><text x="40" y="52" text-anchor="middle" font-size="35" font-family="Montserrat,Arial" font-weight="800" fill="#F6F2E7">${i+1}</text></symbol>`).join("\n");
const eventSymbols = ["barbarian-1","barbarian-2","barbarian-3","trade","politics","science"].map((id,i)=>`<symbol id="event-${id}" viewBox="0 0 80 80"><rect x="9" y="9" width="62" height="62" rx="13" fill="#ECE7D8" stroke="#111" stroke-width="5"/><g transform="translate(0 ${i%2?2:0})" fill="none" stroke="${i<3?'#1D4F8C':i===3?'#7F8A6A':i===4?'#C88B6A':'#c9a24a'}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${iconBody(id,i+3)}</g></symbol>`).join("\n");

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none"><defs>${symbols}${diceSymbols}${redDice}${eventSymbols}</defs></svg>`;

function textureSvg(kind) {
  const p = themeData.hamsa.palette;
  const base = { deep:"#124b68", shallow:"#4f9daf", normal:"#7f7fff", foam:"#ffffff", wet:"#b99b74", sand:p.sand, rock:"#8a8174", wood:"#8a5a34", cloth:p.cream, caustics:"#6fc3d0", ripple:"#7ac0cc" }[kind];
  const pattern = kind === "wood"
    ? `<path d="M0 32C70 8 125 54 256 20M0 92C78 61 142 110 256 76M0 158C83 125 161 177 256 140M0 224C80 190 161 243 256 207" fill="none" stroke="#4d321f" stroke-width="6" opacity=".45"/>`
    : kind === "cloth"
    ? `<path d="M0 0L256 256M-64 0L192 256M64 0L320 256M256 0L0 256M320 0L64 256M192 0L-64 256" stroke="#c8bfae" stroke-width="3" opacity=".55"/>`
    : kind === "foam"
    ? `<path d="M-20 55C40 5 76 95 134 48S231 65 280 16M-25 145C38 96 77 187 139 139S232 157 281 108M-20 231C37 184 82 270 142 224S234 242 279 195" fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round" opacity=".8"/>`
    : `<path d="M-20 54C43 12 79 87 139 46S230 65 278 26M-20 133C42 91 83 166 143 125S231 143 280 105M-20 216C44 171 84 249 145 207S232 226 281 188" fill="none" stroke="#fff" stroke-width="${kind==='normal'?5:kind==='sand'||kind==='rock'?8:10}" opacity="${kind==='deep'||kind==='shallow'?'.23':'.35'}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="${base}"/>${pattern}<filter id="n"><feTurbulence baseFrequency=".07" numOctaves="3" seed="11"/><feComponentTransfer><feFuncA type="table" tableValues="0 .17"/></feComponentTransfer></filter><rect width="256" height="256" filter="url(#n)" opacity=".4"/></svg>`;
}

function frameSvg(name, accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 520"><defs>${paperFilter}</defs><rect x="10" y="10" width="340" height="500" rx="28" fill="#F6F2E7" stroke="#111" stroke-width="8"/><rect x="28" y="28" width="304" height="464" rx="19" fill="none" stroke="${accent}" stroke-width="5"/><path d="M48 95C130 58 202 110 312 64" fill="none" stroke="${accent}" stroke-width="5" stroke-dasharray="14 12"/><circle cx="180" cy="260" r="104" fill="#ECE7D8" stroke="${accent}" stroke-width="5"/><text x="180" y="458" text-anchor="middle" font-family="Playfair Display,serif" font-size="28" fill="#111">${name}</text></svg>`;
}

for (const theme of Object.keys(themeData)) {
  for (const kind of ["wood","brick","grain","wool","ore","desert","sea"]) {
    await write(`themes/${theme}/hex/${kind}.svg`, terrainSvg(theme, kind));
  }
}

for (const [file, kind] of Object.entries({
  "deep-ocean.svg":"deep", "shallow-water.svg":"shallow", "wave-normal.svg":"normal", "shore-foam.svg":"foam", "wet-sand.svg":"wet", "sand.svg":"sand", "cliff-rock.svg":"rock", "dock-wood.svg":"wood", "sailcloth.svg":"cloth", "caustics.svg":"caustics", "coast-ripple.svg":"ripple"
})) await write(`shared/materials/${file}`, textureSvg(kind));

await write("sprites/game-icons.svg", sprite);
await write("shared/cards/resource-frame.svg", frameSvg("Resource", "#7F8A6A"));
await write("shared/cards/commodity-frame.svg", frameSvg("Commodity", "#C88B6A"));
await write("shared/cards/progress-trade.svg", frameSvg("Trade", "#7F8A6A"));
await write("shared/cards/progress-politics.svg", frameSvg("Politics", "#C88B6A"));
await write("shared/cards/progress-science.svg", frameSvg("Science", "#1D4F8C"));
await write("shared/cards/card-back.svg", frameSvg("Hamsa Nomads", "#1D4F8C"));

const terrains = Object.fromEntries(Object.keys(themeData).map(theme => [theme, Object.fromEntries(["wood","brick","grain","wool","ore","desert","sea"].map(kind => [kind, `/assets/game/themes/${theme}/hex/${kind}.svg`]))]));
const materials = Object.fromEntries(Object.keys({"deep-ocean.svg":1,"shallow-water.svg":1,"wave-normal.svg":1,"shore-foam.svg":1,"wet-sand.svg":1,"sand.svg":1,"cliff-rock.svg":1,"dock-wood.svg":1,"sailcloth.svg":1,"caustics.svg":1,"coast-ripple.svg":1}).map(file => [file.replace(".svg",""), `/assets/game/shared/materials/${file}`]));
const manifest = {
  version: 1,
  generatedBy: "scripts/generate-game-assets.mjs",
  palette: themeData.hamsa.palette,
  themes: terrains,
  sprite: "/assets/game/sprites/game-icons.svg",
  icons: iconIds,
  dice: { standard: [1,2,3,4,5,6].map(n=>`die-${n}`), red: [1,2,3,4,5,6].map(n=>`red-die-${n}`), event: ["event-barbarian-1","event-barbarian-2","event-barbarian-3","event-trade","event-politics","event-science"] },
  materials,
  cards: {
    resource: "/assets/game/shared/cards/resource-frame.svg",
    commodity: "/assets/game/shared/cards/commodity-frame.svg",
    trade: "/assets/game/shared/cards/progress-trade.svg",
    politics: "/assets/game/shared/cards/progress-politics.svg",
    science: "/assets/game/shared/cards/progress-science.svg",
    back: "/assets/game/shared/cards/card-back.svg"
  }
};
await write("manifest.json", JSON.stringify(manifest, null, 2));

const tileCells = [];
let row = 0;
for (const theme of Object.keys(themeData)) {
  let col = 0;
  for (const kind of ["wood","brick","grain","wool","ore","desert","sea"]) {
    const x = 30 + col * 150, y = 55 + row * 180;
    tileCells.push(`<image href="../themes/${theme}/hex/${kind}.svg" x="${x}" y="${y}" width="128" height="128"/><text x="${x+64}" y="${y+150}" text-anchor="middle" font-family="Montserrat,Arial" font-size="15" fill="#111">${theme} · ${kind}</text>`);
    col++;
  }
  row++;
}
const contact = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 760"><rect width="1120" height="760" fill="#F6F2E7"/><text x="30" y="34" font-family="Playfair Display,serif" font-size="28" fill="#111">Catanlike Asset Contact Sheet</text>${tileCells.join("")}<g transform="translate(30 620)"><rect width="1060" height="110" rx="18" fill="#ECE7D8" stroke="#111"/><text x="24" y="34" font-family="Montserrat,Arial" font-size="16" fill="#111">Generated systems: 21 terrain tiles · 11 material maps · ${iconIds.length + 18} sprite symbols · 6 card frames · themed low-poly pieces in React Three Fiber</text><path d="M24 68C180 32 304 95 468 57S780 81 1035 39" fill="none" stroke="#1D4F8C" stroke-width="6" stroke-linecap="round"/><path d="M25 88C225 58 368 112 584 78S858 99 1034 70" fill="none" stroke="#C88B6A" stroke-width="4" stroke-dasharray="13 12"/></g></svg>`;
await write("preview/asset-contact-sheet.svg", contact);

console.log(`Generated Catanlike game assets in ${root}`);
