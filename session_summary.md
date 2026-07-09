# Hamsa Nomads — Session Summary

Focus: **design · gameplay · debug**. An original, mobile-first hex resource-trading
board game (no Catan branding, art, or text) built with Next.js 14 + TypeScript +
Tailwind + boardgame.io, deployed as a static export to GitHub Pages.

## Design

- **Visual system**: parchment/cream background, navy ink, terracotta (rust), olive,
  and gold accents — matching the provided mockups. Rounded "card" surfaces, uppercase
  tracked labels, SVG hex board. Mobile-first with `landscape:` layout variants.
- **Themes re-skin only**: canonical resource keys (`wood/brick/grain/wool/ore`) are
  fixed in the rules; themes swap icons/labels/colors without touching game logic.
- **Entry points**: home cards for Standard, Cities & Knights, Local Multiplayer,
  Online, Rules, Studio, and Resume.
- **Privacy by design**: rivals expose only PUBLIC info (name, bot flag, total card
  count) — never their hand. Pass-and-play uses handoff curtains between turns.

## Gameplay

- **Standard mode**: full settlement/city/road building, robber ("bandit"), dev cards
  (knight, road building, year of plenty, monopoly, victory), bank + player trades,
  longest road / largest army.
- **Trading**: bank trades (rate lowered by Merchant), and player-to-player offers
  (propose / accept / refuse / cancel). Bots evaluate offers on a per-difficulty
  value heuristic and can also propose their own trades — they never blindly accept.
- **Bots**: easy / normal / hard, chosen per seat.
- **Cities & Knights** (original implementation of the ruleset):
  - Setup places a settlement + road, then a **city** + road, with city-terrain
    starting resources and **no commodities** during setup.
  - Production dice double as red/yellow; a third **event die** drives barbarians
    (faces 1-3) or a discipline gate (trade/politics/science).
  - **City production**: commodity terrains yield 1 resource + 1 commodity; others
    yield 2 resources.
  - **Progress cards** — a clean 12-card set across three tracks:
    - trade: harvest, merchant, caravan, marketDay
    - politics: diplomat, warlord, intrigue, levy
    - science: roadworks, invention, oreRush, scholar
    - Draw eligibility: on a discipline gate, a player draws when the red die is at
      most their improvement level on that track.
  - **Knights**: build / activate / deactivate / upgrade (basic→strong→mighty),
    only active knights count toward defense.
  - **Barbarians** advance on event rolls; at the track end, total active knight
    strength is compared to city count — strongest defender earns renown, undefended
    cities are reduced.
- **Save / resume**: versioned localStorage snapshot; resume replays into a single
  play phase.

## Debug (this session)

Three parallel branches (this feature branch + a per-seat-setup codex branch + a
"Test" branch) were merged into `main`, producing an **internally inconsistent,
non-compiling tree** — two half-merged progress-card designs and duplicated code.
The CI lint step failed first, masking ~20 deeper `tsc` errors. Fixes:

- **moves.ts**: removed duplicate `COMMODITY_FROM_RESOURCE` import and duplicate
  `upgradeKnight` function; replaced the undefined `ensureExpandedState` /
  undefined `rng` with `ensureCkState` and a proper `random`-backed RNG; wired the
  event die through `eventFromDie` / `advanceBarbarians` / `runProgressEvent`
  (previously passed a raw die where a track was expected); deleted a buggy block
  that **double-applied** progress-card effects.
- **types/game.ts + constants.ts + ProgressCardPlay.tsx**: unified everything on the
  12-card progress set (union, labels, tracks, deck, and NEEDS were out of sync).
- **game.ts**: removed a duplicate `upgradeKnight` import and a second, broken
  play-phase move block referencing a nonexistent `playerTrade`; derived
  `playerModes` / `difficulties` from the normalized per-seat setups.
- **game/page.tsx**: imported the missing `createResumeGame`; dropped a dead var.
- **new/page.tsx**: removed an orphaned `hasSavedGame` call and duplicate object keys;
  kept the per-seat setup feature (human / remote / bot + difficulty per seat).
- **TradePanel.tsx**: removed a **privacy regression** that read rivals' exact hands;
  the public card count now comes from `rivals[].cardCount`.
- **helpers.ts**: restored the C&K fields the merge stripped from `makeState`.

**Result**: `eslint` clean, `tsc` clean, **63/63 tests pass**, `npm run build` and
`npm run pages:build` both succeed.

### Runtime crashes (second pass)

The build was green but the deployed app crashed at runtime — masked because
`GameBoardPlay.tsx` carries `// @ts-nocheck`, so undefined variables slip past
`tsc`. Reproduced with a headless browser (Playwright) driving `/new` → `/game`,
then swept every undefined identifier by momentarily lifting `@ts-nocheck` and
running `tsc`:

- **`ackPlayer` / `needsHandoff`** — a second, half-merged pass-and-play curtain
  referenced an undeclared state. Removed it; the fully-wired `privacyGate` curtain
  already covers handoffs.
- **`cardToPlay` / `setCardToPlay`** — the progress-card choice overlay lost its
  state; restored it and re-routed choice-requiring cards (caravan, invention,
  marketDay, scholar, intrigue) through the picker via `cardNeedsChoice`.
- **`saveGame`, `botProposeRef`, `botProposeTrade`, `tradeReviewed`** — missing
  imports/state for autosave, the once-per-turn bot trade proposal, and the private
  human trade-review flow.
- **`playerTrade` move** — the trade panel called a nonexistent move and passed
  privacy-leaking props (`players`, `currentPlayer`). Rewired to the engine's
  `proposeTrade` (auto-settles bots, parks human offers in `pendingTrade`) with the
  privacy-safe `rivals` props.
- **404 image storm** — home images used raw `/assets/...` paths without the
  GitHub-Pages `/Catanlike` base, and the `onError` fallback pointed at an
  equally-unprefixed `fallback.svg`, re-firing `onError` in an infinite loop. All
  paths now go through `asset()`, and the fallback detaches its handler after one
  swap. Verified the built HTML emits `/Catanlike/...` and no bare paths remain.

Verified end-to-end: headless run of Standard and Cities & Knights reaches the game
board with **zero console/page errors**; lint, tsc, 63 tests, build, and pages:build
all green.

### Commodity system (third pass)

Corrected the Cities & Knights commodity model to the real ruleset:

- Renamed the internal commodity key `book` → `paper` (keys are now
  `paper, coin, cloth`). City production mapping: **wood → +1 wood +1 paper,
  ore → +1 ore +1 coin, wool → +1 wool +1 cloth**; brick/grain cities give
  2 resources and no commodity. Track commodities: trade = cloth, politics = coin,
  science = paper.
- Introduced a single `produce()` helper as the source of truth for both dice
  production and starting-city output, so the **second C&K setup placement (a
  city) now awards the correct commodities**, not just bare resources.
- UI shows **Paper 📜 / Coin 🪙 / Cloth 🧵** with readable labels and counts in the
  always-visible C&K panel (no raw lowercase keys); progress-card picker and
  improve-city prompts use the same labels/icons. Base game and normal-resource
  theming are untouched.
- Added `normalizeCommodities()` for backward compatibility — migrates a saved
  `book` balance into `paper` and defaults missing keys to 0 (applied in
  `ensureCkState`).
- Added 7 tests (city production per terrain, base-city 2-resources-only,
  settlement, starting-city output, save migration). Suite now **70/70 green**;
  lint, tsc, build, pages:build all pass; verified the live C&K panel on a
  390px mobile viewport.

> Note: `main` and the `Test` branch share the same broken tree (main merged Test).
> This fix lands on `claude/hex-trading-game-theme-uwww7r`; `main` needs it merged
> to go green.
