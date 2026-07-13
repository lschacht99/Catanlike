# Catanlike visual asset system

## Purpose

The game uses one deterministic, local asset pipeline for the Classic Isles, Hamsa Nomads, and Israel Landscape themes. The artwork is original and is not copied from CATAN components, cards, models, or branding.

The Hamsa pack follows the supplied identity: warm cream and parchment, sand, clay, olive/sage, Tunisian blue, ink-black outlines, imperfect travel routes, Mediterranean plaster architecture, wood, woven cloth, pottery, palms, and natural light.

## Generation

```bash
npm run assets:generate
```

The generator is safe to run repeatedly and does not use network calls, paid APIs, AI services, binary encoders, or runtime downloads. `predev`, `pretest`, `prebuild`, and `prepages:build` run it automatically.

Generator:

- `scripts/generate-game-assets.mjs`

Generated root:

- `public/assets/game/`

## Generated inventory

- 21 terrain illustrations: 7 terrains × 3 themes
- 11 seamless/material SVGs
- 77 SVG sprite symbols: resource, commodity, discipline, build, harbor, dice, development-card, progress-card, and status icons
- 6 original card-frame assets
- 1 JSON manifest
- 1 visual contact sheet

The source generator is canonical. Generated files are created before every local/deployment build so GitHub Pages, Vercel, and local development receive identical output.

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
- knight style: traveling scout with level marks and a restrained active-state brass ring
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
- generated paths use lowercase kebab-case
- theme visuals never change game-rule keys
- miniature ownership uses `PLAYER_COLORS`; architecture uses theme materials
- knight rank is numeric `1`, `2`, or `3`; active state is a separate boolean

## Rendering

### 2D

`HexBoardPlay` clips each square terrain SVG into the actual pointy-top board hex. It renders roads, settlements, cities, knights, bandit, tokens, and valid-placement targets as vectors. Knights are separate from buildings and have visible rank marks and distinct active/inactive states.

### 3D

`HexBoard3D` uses:

- a shared module-level texture cache
- one GPU-driven water surface with no React state updates per frame
- theme-specific water, sand, sky, buildings, knights, harbors, and terrain decor
- independent knight meshes for level and active state
- deterministic decor placement outside the number-token center
- preserved large invisible touch targets and orbit-drag protection

Common pieces are lightweight React Three Fiber geometry rather than unvalidated binary models. No Three.js object is stored in the game state or Firebase snapshot.

## Base paths

All bundled paths pass through `assetUrl()`.

Supported targets:

- local Next.js: `/assets/game/...`
- Vercel: `/assets/game/...`
- GitHub Pages: `/Catanlike/assets/game/...`

Custom remote image/data URLs remain unchanged.

## Fallback behavior

Old/custom themes do not need the new `visuals` field. They fall back to the Classic visual pack while preserving their own colors, labels, custom tile images, and saved localStorage shape.

If WebGL is unavailable or the 3D board throws, `BoardStage` uses the full 2D SVG renderer. If a terrain texture has not decoded yet, the underlying terrain color remains visible.

## Performance budgets

- generated terrain is SVG rather than 4K raster data
- no external runtime asset requests
- no per-frame React updates for water
- texture cache survives online snapshot remounts
- decor does not cast individual shadows
- common pieces use low-segment geometry
- Canvas DPR is capped at 1.7
- shared material/texture objects are never put into serialized state

## Adding a fourth theme

1. Add palette and terrain design rules to `themeData` in `scripts/generate-game-assets.mjs`.
2. Extend `BuiltinVisualThemeId`.
3. Add the new pack to `GAME_ASSETS`.
4. Add `tileArt` and `visuals` to the new `Theme` object.
5. Run `npm run assets:generate`.
6. Verify the new row in `public/assets/game/preview/asset-contact-sheet.svg`.
7. Run `npm test`, `npm run build`, and `npm run pages:build`.

## Future-ready pieces

`SpecialPieces.tsx` contains original lightweight models for:

- barbarian ship
- merchant
- city wall
- trade/politics/science metropolis

They are intentionally not attached to serialized board positions until the corresponding game-state fields exist. This prevents fake visual state and keeps online snapshots canonical.
