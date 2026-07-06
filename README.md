# ⬡ Hex Isles

A **mobile-first, themeable hex-board resource trading game** you can play
pass-and-play on one phone. Built with TypeScript, React, Tailwind, boardgame.io, and a mobile-first 3D board layer designed for a Vite/Three.js migration path.

Hex Isles is an original game *inspired by* classic hex resource-trading
mechanics. It uses its own name, art, labels and text, and is not affiliated
with or endorsed by any commercial board game.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Other commands:

```bash
npm test           # vitest — generator + rules unit tests
npm run build      # production build
npm start          # serve the production build
```

Open it on a phone (or a narrow browser window), tap **Play**, pick 3–4
players and a theme, and pass the phone around.

## What's playable (MVP)

- **2-player duel mode** with a smaller 7-hex preset, plus 3–4 player local pass-and-play
- Balanced **19-hex board generator** (generates hundreds of candidates and
  keeps the best-scoring one)
- Snake-order setup: two settlements + roads each, second settlement pays out
- Dice roll → resource distribution to adjacent settlements (x1) / cities (x2)
- Build roads, settlements (distance rule + road connectivity) and cities
- **Bandit** on a 7: blocks a tile's production and steals a random card from
  an adjacent opponent
- Bank trade **4 : 1**
- Victory at **10 points** (settlement = 1, city = 2)
- **Map Forge**: generate/regenerate boards, see the balance score, save
  boards to localStorage and replay them
- **Theme editor**: duplicate a built-in theme, rename every resource, change
  icons/colors and building names, saved to localStorage
- Installable PWA shell (manifest + icons), 3D elevated board presentation, pinch-zoom/drag tap layer, bottom drawer UI sized for thumbs
- Backend Gemini theme endpoint scaffold at `server/gemini/theme.ts`; API keys stay server-side and generated JSON is sanitized before use
- Optional advanced rules module scaffold (`guardians-and-guilds`) for knights, activation, invasion track, city improvements, and progress-card style systems


## Publish to GitHub Pages

This repo is configured for GitHub Pages using Next.js static export and the official Pages GitHub Actions flow:

1. Push to `main`.
2. In the GitHub repo, open **Settings → Pages**.
3. Set **Build and deployment → Source** to **GitHub Actions**.
4. Wait for the **Deploy static site to GitHub Pages** workflow to finish.
5. Open `https://<github-user>.github.io/<repo-name>/`.

For this repository name, the manual local Pages build is:

```bash
npm run pages:build
```

The workflow sets `NEXT_PUBLIC_BASE_PATH` to `/${{ github.event.repository.name }}` so links, scripts, styles, manifest, and icons work from a GitHub Pages subpath.

## The one rule that matters: themes never touch rules

The engine only ever sees canonical resource keys:

```ts
type ResourceKey = "wood" | "brick" | "grain" | "wool" | "ore";
```

Themes are a pure presentation layer (`src/game/themes.ts`). The **Japan**
theme ships as the seed example:

| Internal key | Japan theme | Classic theme |
| ------------ | ----------- | ------------- |
| wood         | Bamboo      | Timber        |
| brick        | Clay Tile   | Brick         |
| grain        | Rice        | Grain         |
| wool         | Silk        | Wool          |
| ore          | Iron        | Ore           |
| desert       | Zen Garden  | Badlands      |
| bandit       | Ronin       | Bandit        |
| road/settlement/city | Path / Village / Castle | Road / Village / City |

The rules still say "wood + brick builds a road"; the UI says
"Bamboo 🎋 + Clay Tile 🏮 builds a Path". Swapping themes can never change
game balance. Each resource theme also carries a `tilePrompt` field reserved
for future AI-generated tile art.

## Architecture

```
src/
  app/
    page.tsx           # home menu
    new/page.tsx       # players + theme + board → start
    game/page.tsx      # boardgame.io client (pass-and-play)
    forge/page.tsx     # map generator w/ balance score + save
    boards/page.tsx    # saved boards, replayable
    themes/page.tsx    # theme list + editor
  components/
    HexBoard.tsx       # pure SVG board, pan/zoom, tap targets
    GameBoard.tsx      # in-game screen wiring state → UI
    PlayerHand.tsx     # resource chips (theme-labelled)
    BuildMenu.tsx      # build buttons with costs + piece limits
    TradePanel.tsx     # 4:1 bank trade sheet
  game/
    engine/            # boardgame.io game definition entrypoint
    game.ts            # boardgame.io game definition (phases, turn order)
    moves.ts           # roll / build / trade / bandit moves
    rules.ts           # ALL placement & cost validation
    scoring.ts         # victory points, winner
    board-generator/   # 2-player duel preset + board validation
    generator.ts       # candidate generation + balance scoring
    geometry.ts        # axial hex math, vertex/edge derivation
    theme-generator/   # Gemini JSON schema sanitizer + sample generated themes
    themes.ts          # theme registry (built-in + localStorage)
    constants.ts       # costs, tile counts, tokens, limits
  types/
    game.ts, theme.ts  # strict shared types
  lib/
    storage.ts         # localStorage: active game, saved boards
```

Rendering never validates anything; `rules.ts` is the single source of truth
and the UI just asks it for the currently-legal vertices/edges/tiles.

### Board generation

Standard tile mix (4 wood, 3 brick, 4 grain, 4 wool, 3 ore, 1 desert) and the
classic token bag `[2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12]`. The generator
scores hundreds of random candidates and penalizes:

- 6 and 8 on adjacent tiles (heavy penalty)
- equal numbers on adjacent tiles
- lopsided pip totals per resource
- the top settlement spots clustering next to each other

## Roadmap (scaffolded, not built)

- Ports / harbor trading (3:1, 2:1)
- Longest-road bonus and development cards
- Discard-half on a 7
- Player-to-player trades
- Online multiplayer (boardgame.io server or Colyseus rooms)
- AI tile art from each theme's `tilePrompt`
- In-progress game persistence across refreshes


## Open-source pattern review

Before expanding the MVP, we reviewed public patterns rather than cloning a full hex-trading game:

- `boardgame.io` remains the right fit for deterministic moves, phases, logs, multiplayer sync, and lobby/server support. The project already used it, so the implementation keeps game rules in pure move functions.
- Three.js/R3F hex-grid and terrain examples are useful architecturally, but adding new scoped packages was blocked by the registry policy in this environment. The current renderer is a lightweight mobile-first pseudo-3D layer with isolated files under `src/three/` so it can be swapped for `@react-three/fiber` components once dependencies are available.
- Three.js dice-roller libraries such as `dice-box-threejs` are intentionally not vendored because they add physics weight and uncontrolled randomness. Hex Isles uses engine-controlled dice results and a deterministic visual tumble.

## Gemini theme endpoint

Run the API server separately after compiling TypeScript or with a TS runner:

```bash
GEMINI_API_KEY=... PORT=8787 node dist/server/index.js
```

`POST /api/gemini/theme` accepts JSON with `prompt`, `location`, and optional base64 image data. The server calls Gemini 2.5 Flash only from the backend, requests JSON output, sanitizes all strings, clamps arrays, preserves canonical resource ids, and falls back to the sample Cherry Bamboo Highlands theme when no API key is present.

Sample generated themes are stored in `src/game/theme-generator/samples.ts`:

- Cherry Bamboo Highlands
- Blocky Mountain Village
