# 🪬 Hamsa Nomads

**Build · Trade · Explore** — a mobile-first, themeable hex-board trading game.
Play pass-and-play on one phone or **online with friends**. Built with
Next.js, TypeScript, Tailwind and [boardgame.io](https://boardgame.io).

Hamsa Nomads is an original game *inspired by* classic hex resource-trading
mechanics. It uses its own name, art, labels and text, and is not affiliated
with or endorsed by any commercial board game.

## Quick start

```bash
npm install
npm run dev        # web app on http://localhost:3000
```

For **online multiplayer**, also run the game server in a second terminal:

```bash
npm run server     # boardgame.io server on :8000
```

Other commands:

```bash
npm test           # vitest — generator, rules, dev-card and scoring tests
npm run build      # production build
npm start          # serve the static export from ./out
```

Configuration:

- `NEXT_PUBLIC_GAME_SERVER` — URL of the game server as seen by browsers
  (defaults to `http://<current-host>:8000`).
- `GAME_SERVER_PORT` — port for `npm run server` (default 8000).
- `GAME_ORIGINS` — comma-separated extra allowed origins in production.

## Playing online

1. One player taps **Create Game**, picks the player count, theme and board,
   and lands in the **Waiting Room** with a game code.
2. Friends tap **Join Game** and paste the code (works across devices on the
   same network, or anywhere the game server is reachable).
3. When every seat is taken the match starts automatically. Turns, dice,
   builds and cards sync live through the authoritative server.

## What's in the game

- 2–4 players, **pass-and-play or online**
- Balanced **19-hex board generator** (best-of-N with a balance score)
- Snake-order setup, dice production, roads / villages / cities
- **Journey (development) cards**: Knight, Victory Point, Road Building,
  Year of Plenty, Monopoly — standard 25-card deck, one play per turn,
  never on the turn you bought it
- **Largest Army** and **Longest Route** banners (2 VP each, with proper
  stealing rules and road-cutting by settlements)
- Bandit on a 7: blocks production, steals from a neighbor
- Bank trade 4:1 · win at 10 points
- **Roll-result sheet** after every roll showing who harvested what
- **Map Forge**: generate, score and save boards; replay from the Collection
- **Illustrated tiles**: procedural vector art per resource (forest,
  bricks, wheat, pasture, mountains, dunes) recolored by the theme — or
  load your own tile artwork per resource (image URL or uploaded photo)
  in the theme editor
- **Collection**: board themes (with a full theme editor) and saved boards
- **Stats**: games, wins, win rate and journey history (stored locally)
- **Profile**: name, avatar, sound/music toggles
- **How to Play** tutorial
- Installable PWA shell, pinch-zoom board, thumb-sized bottom controls

## Screens

Home · New Journey · Game (with Build / Trade / Cards sheets and the robber
flow) · Create Game · Join Game · Waiting Room · Online Play · Map Forge ·
Collection (themes + boards) · Stats · Profile · How to Play — all in a warm
parchment design system (navy ink + terracotta accents, serif display type,
pill buttons, bottom navigation).

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
server/
  index.ts           # boardgame.io server for online matches (tsx)
src/
  app/
    page.tsx         # home menu
    new/             # pass-and-play setup (players, names, theme, board)
    game/            # local boardgame.io client
    online/create/   # create online match (lobby)
    online/join/     # join by game code
    online/room/[id] # waiting room (polls the lobby)
    online/play/[id] # SocketIO multiplayer client
    forge/           # map generator w/ balance score + save
    collection/      # themes (editor) + saved boards
    stats/           # local game history & overview
    profile/         # name, avatar, settings
    how-to-play/     # tutorial
  components/
    HexBoard.tsx     # pure SVG board, pan/zoom, tap targets
    GameBoard.tsx    # in-game screen (local + online aware)
    BuildMenu.tsx    # build sheet incl. journey cards
    DevCards.tsx     # card hand + play flows (pickers for YoP/Monopoly)
    TradePanel.tsx   # 4:1 market gate sheet
    RollResult.tsx   # dice + production overlay
    PlayerHand.tsx   # resource chips (theme-labelled)
    ThemeEditor.tsx  # full theme editor
    Sheet.tsx, ui.tsx# design-system primitives (parchment/navy/rust)
  game/
    game.ts          # local + online game definitions (phases, turn order)
    moves.ts         # roll / build / trade / bandit / dev-card moves
    rules.ts         # ALL placement, cost & card validation
    scoring.ts       # points, longest road, largest army, winner
    generator.ts     # candidate generation + balance scoring
    geometry.ts      # axial hex math, vertex/edge derivation
    themes.ts        # theme registry (built-in + localStorage)
    constants.ts     # costs, decks, limits, palette
  lib/
    online.ts        # lobby client, seats/credentials
    profile.ts       # profile + local stats storage
    storage.ts       # game config + saved boards
```

Rendering never validates anything; `rules.ts` is the single source of truth
and the UI just asks it for the currently-legal vertices/edges/tiles/cards.

### Board generation

Standard tile mix (4 wood, 3 brick, 4 grain, 4 wool, 3 ore, 1 desert) and the
classic token bag `[2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12]`. The generator
scores hundreds of random candidates and penalizes:

- 6 and 8 on adjacent tiles (heavy penalty)
- equal numbers on adjacent tiles
- lopsided pip totals per resource
- the top settlement spots clustering next to each other

## Multiplayer, trading & Cities & Knights

- **Local pass-and-play** (2–4 humans on one device) with a **pass-the-device
  privacy curtain** between turns — the previous player's hand and cards are
  hidden until the named player taps "Show my turn".
- **Player-to-player trade offers** with privacy: the proposer picks what to
  give and request and sees only *how many* cards a rival holds — never the
  breakdown. The receiver privately accepts/refuses (with its own handoff);
  resources move only on acceptance. Illegal or unaffordable offers are
  rejected by the engine.
- **Bot trade AI** (`src/game/ai/trade.ts`): bots value needed vs surplus
  resources, refuse deals they can't pay or that only help the leader, accept
  fair/useful ones, with a little randomness. Results show Accepted/Refused
  with a short reason.
- **Cities & Knights mode** (`src/game/ck.ts`, documented in
  `docs/cities-knights-plan.md`): commodities from cities, three city
  improvement tracks, knights (build / activate / upgrade / deactivate), an
  event die, a raider (barbarian) track with attack resolution, and a
  30-card, 3-track **progress deck** with all effects implemented (original
  names, no copied text). Win at 13 points.
- **Save / Resume**: local games autosave at each clean turn start
  (`src/lib/savegame.ts`, versioned). The home screen shows **Resume Game**
  only when a valid save exists; invalid/old saves are rejected gracefully.
- **Online multiplayer** stays honest on static hosting: without a configured
  game server the Multiplayer hub says *"Online multiplayer requires server
  setup"* rather than faking it. Set `NEXT_PUBLIC_GAME_SERVER` and run
  `npm run server` to enable the built-in lobby (Create · Join · Waiting Room).
- **Home entry points**: Standard, Cities & Knights, Multiplayer, Custom
  Map/Theme, Resume (conditional), Rules — each a distinct, tappable card with
  lazy-loaded, fallback-safe placeholder art (`public/assets`, `SafeImage`).
- **Landscape layout**: the game screen flips to board-left / controls-rail
  on landscape phones and tablets, with no horizontal overflow.

## Roadmap (scaffolded, not built)

- Ports / harbor trading (3:1, 2:1)
- Discard-half on a 7
- Hidden opponent hands online (boardgame.io playerView / secret state)
- Metropolis pieces & city walls for Cities & Knights
- AI tile art from each theme's `tilePrompt`
