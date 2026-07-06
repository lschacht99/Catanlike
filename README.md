# ⬡ Hex Isles

A **mobile-first, themeable hex-board resource trading game** you can play
pass-and-play on one phone. Built with Next.js, TypeScript, Tailwind and
[boardgame.io](https://boardgame.io).

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

- 3–4 player **local pass-and-play** on one device
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
- Installable PWA shell (manifest + icons), pinch-zoom/drag board, bottom
  drawer UI sized for thumbs

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
    game.ts            # boardgame.io game definition (phases, turn order)
    moves.ts           # roll / build / trade / bandit moves
    rules.ts           # ALL placement & cost validation
    scoring.ts         # victory points, winner
    generator.ts       # candidate generation + balance scoring
    geometry.ts        # axial hex math, vertex/edge derivation
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
