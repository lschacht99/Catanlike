# Catanlike visual asset system

## Purpose

The game uses one deterministic, local asset pipeline for the Classic Isles, Hamsa Nomads, and Israel Landscape themes. The artwork is original and is not copied from CATAN components, cards, models, or branding.

The Hamsa pack follows the supplied identity: warm cream and parchment, sand, clay, olive/sage, Tunisian blue, ink-black outlines, imperfect travel routes, Mediterranean plaster architecture, wood, woven cloth, pottery, palms, and natural light.

## Generation

```bash
npm run assets:generate
```

The command runs:

- `scripts/generate-game-assets.mjs` — creates terrain, materials, cards, the main sprite, manifest, and contact sheet
- `scripts/finalize-game-assets.mjs` — normalizes the sprite, adds badge symbols, writes every symbol as an individual SVG, and records exact counts

The pipeline is deterministic, safe to rerun, and uses no network calls, paid APIs, runtime AI, binary encoders, or remote downloads. `predev`, `pretest`, `prebuild`, and `prepages:build` run it automatically.

Generated root:

- `public/assets/game/`

## Generated inventory

The generated manifest is the source of truth and currently records **132 generated files**:

- 21 terrain illustrations: 7 terrains × 3 themes
- 11 seamless/material SVGs
- 91 symbols in the combined SVG sprite
- 91 matching standalone SVG icons, including normal dice, red dice, event dice, harbors, cards, badges, and state icons
- 6 original card-frame assets
- 1 JSON manifest
- 1 visual contact sheet
- 1 combined sprite sheet

Generated files are committed and are also recreated before local and deployment builds, so Vercel, GitHub Pages, tests, and local development receive identical output.

## Directory structure

```text
public/assets/game/
  manifest.json
  shared/
    materials/
      deep-ocean.svg
      shallow-water.svg
      wave-normal.svg
      shore-foam.svg
      wet-sand.svg
      sand.svg
      cliff-rock.svg
      dock-wood.svg
      sailcloth.svg
      caustics.svg
      coast-ripple.svg
    cards/
      resource-frame.svg
      commodity-frame.svg
      progress-trade.svg
      progress-politics.svg
      progress-science.svg
      card-back.svg
    ui/
      *.svg
    dice/
      die-*.svg
      red-die-*.svg
      event-*.svg
  sprites/
    game-icons.svg
  themes/
    classic/hex/*.svg
    hamsa/hex/*.svg
    israel/hex/*.svg
  preview/
    asset-contact-sheet.svg
```

Runtime code:

```text
src/game/assets/
  assetTypes.ts
  assetManifest.ts
  assetUrl.ts

src/components/board3d/pieces/
  GamePieces.tsx
  HarborPiece.tsx
  TerrainDecor.tsx
  SpecialPieces.tsx
```

## Theme mapping

### Classic Isles

- wood: evergreen woodland
- brick: terracotta quarry
- grain: wheat fields
- wool: green sheep pasture
- ore: slate/granite peaks
- desert: warm badlands
- architecture: timber/plaster village and stone city
- knight style: island guardian

### Hamsa Nomads

- wood: Olive Route
- brick: Terracotta Stop
- grain: Market Harvest
- wool: Tent Weave
- ore: Compass Brass
- desert: Passport Sands
- architecture: cream medina, flat roofs, arches, blue windows, carved doors, stairs
- knight style: traveling scout with visible level marks and a restrained active-state brass ring
- harbor style: warm dock, cream sailcloth, clay hull, hand-painted trade plaque

### Israel Landscape

- wood: olive grove
- brick: limestone quarry
- grain: terraced wheat
- wool: goats/sheep hillside
- ore: copper and Negev rock
- desert: Negev dunes and scrub
- architecture: limestone moshav/citadel
- knight style: landscape guard

No theme asset contains flags, military insignia, modern political symbols, or Magen David imagery.

## Naming conventions

- canonical terrain keys remain `wood`, `brick`, `grain`, `wool`, `ore`, and `desert`
- canonical commodity and discipline keys remain unchanged
- generated paths use lowercase kebab-case
- theme visuals never alter gameplay-rule keys
- ownership uses `PLAYER_COLORS`; architecture uses theme materials
- knight rank is numeric `1`, `2`, or `3`; active state is a separate boolean
- standalone icon names match their sprite symbol IDs

## Rendering

### 2D

`HexBoardPlay` clips each square terrain SVG into the actual pointy-top board hex. It renders roads, settlements, cities, knights, bandit, tokens, and valid-placement targets as vectors. Knights are independent of buildings and show rank and active/inactive state.

### 3D

`HexBoard3D` uses:

- a shared module-level texture cache
- one GPU-driven water surface with no React state updates per frame
- theme-specific water, sand, sky, buildings, knights, harbors, and terrain decor
- independent knight meshes for levels 1–3 and active state
- deterministic decor placement outside the number-token center
- large invisible touch targets and orbit-drag protection

Common pieces are lightweight React Three Fiber geometry rather than unvalidated binary models. No Three.js object, texture, material, or function is stored in the game state or Firebase snapshot.

## Base paths

All bundled paths pass through `assetUrl()`.

Supported targets:

- local Next.js: `/assets/game/...`
- Vercel: `/assets/game/...`
- GitHub Pages: `/Catanlike/assets/game/...`

Custom remote image and data URLs remain unchanged.

## Fallback behavior

Old and custom themes do not need the optional `visuals` field. They fall back to the Classic visual pack while preserving their own colors, labels, custom tile images, and saved localStorage shape.

If WebGL is unavailable or the 3D board throws, `BoardStage` uses the complete 2D SVG renderer. If a terrain texture has not decoded yet, the underlying terrain color remains visible.

## Performance budgets

- SVG terrain instead of unnecessary 4K raster textures
- no external runtime asset requests
- no per-frame React updates for water
- texture cache survives serialized online snapshots
- lightweight terrain decor and low-segment miniature geometry
- Canvas device-pixel ratio capped at 1.7
- shared GPU resources never enter serialized state

## Adding a fourth theme

1. Add palette and terrain design rules to `themeData` in `scripts/generate-game-assets.mjs`.
2. Extend `BuiltinVisualThemeId`.
3. Add the pack to `GAME_ASSETS`.
4. Add `tileArt` and `visuals` to the theme object.
5. Run `npm run assets:generate`.
6. Verify the new row in `public/assets/game/preview/asset-contact-sheet.svg`.
7. Run `npm test`, `npm run build`, and `npm run pages:build`.

## Future-ready pieces

`SpecialPieces.tsx` contains original lightweight models for:

- barbarian ship
- merchant
- city wall
- trade, politics, and science metropolises

They are intentionally not attached to serialized board positions until corresponding canonical game-state fields exist. This avoids fake visual state and preserves online synchronization.
