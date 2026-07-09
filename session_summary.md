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

> Note: `main` and the `Test` branch share the same broken tree (main merged Test).
> This fix lands on `claude/hex-trading-game-theme-uwww7r`; `main` needs it merged
> to go green.
