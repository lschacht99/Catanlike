# Hamsa Nomads · Island Duel (standalone)
  
This is an **independent**, experimental two-phone browser game. It lives in a separate path and does not replace, import from, or modify the main Catanlike game engine, pages, online lobby, or its multiplayer server.

## URL and file ownership

| Purpose | Path |
| --- | --- |
| iPhone-facing static application | `public/island-duel/index.html` |
| Backend source | `island-duel/supabase/index.ts` |
| Isolated room-table migration | `island-duel/supabase/001_create_rooms.sql` |
| GitHub Pages URL after deploying to `main` | `https://lschacht99.github.io/Catanlike/island-duel/index.html` |
| Static-export path | `/Catanlike/island-duel/index.html` |
| Complete asset browser | `/Catanlike/island-duel/assets/index.html` |
| Independent asset directory | `public/island-duel/assets/` (62 illustrated WebP assets) |
| Production backend (separate Supabase Edge Function) | `https://vvveenntewwtyhnmimal.supabase.co/functions/v1/hamsa-island-duel-v1` |

The web client calls that Edge Function's `/api/*` endpoints directly. Visual assets load as relative files from the game's separate `/island-duel/assets/` directory. The previously shared Supabase function root is *not* the page hosting URL: some browser surfaces expose its HTML as source text. Open the GitHub Pages static document instead, once deployed.

## Playing with two iPhones

1. Open the **same** deployed `/island-duel/index.html` page in Safari on both phones.
2. Phone one selects **Create a game** and receives an eight-character code.
3. Phone two enters the code and selects **Join game**. The first phone is Lulab, the second is Mara.
4. Turns sync over HTTPS through the room table. Both phones need an internet connection. No account, Bluetooth pairing, or same Wi-Fi is required.

## What this demo does

A 19-hex board with numbered terrain, distinct public buildings and roads, red/yellow production dice, an event die with barbarian/science/trade/politics results, supplies and commodities, basic building and city improvements, knights, simplified barbarian attacks, a 13-point victory target, and private resource inventories. Refreshing a phone retains its seat token in that browser's local storage.

**Not complete Cities & Knights.** This quick-start house-rules version deliberately omits robber/discard implementation, full progress-card decks, strict two-player neutral-player rules, normal setup rounds, certain placement restrictions and full barbarian resolution. The UI now uses original illustrated forest/hills/pasture/fields/mountain/desert hexes, number markers, the corrected red/yellow/event dice, eight supplies, city/settlement/knight pieces, and Lulab/Mara portraits. A separate mobile-first art library at `/island-duel/assets/index.html` displays all 62 prepared art files, including two concept sheets. Some pieces (e.g., ports) remain future-rule assets rather than active game mechanics. Do not describe it as rules-complete or iOS-native.

## Safe deployment

- Static HTML lives only under `public/island-duel/`; it does not introduce a conflicting Next.js `src/app` route or modify existing code.
- The API room table uses a namespaced name, `hamsa_island_duel_rooms`; never point the migration at any of the main game's tables.
- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` in HTML or git. Supply it as a backend secret in Supabase; RLS blocks browser access directly.
- The Edge Function is hosted separately. GitHub Pages serves **only** the public static HTML.
- This is a prototype with anonymous room tokens and no rate limiting. Do not use it for private or high-stakes data.
- GitHub Pages deployment workflow currently runs from `main` only; adding a file on the default `Assetversion` branch **does not automatically publish it**. The standalone folder can be cherry-picked to `main` independently; avoid merging the diverged branches together merely for this demo.

## Basic smoke checks

- Run the repo's existing `npm test` and `npm run pages:build`. Ensure `out/island-duel/index.html` exists.
- Open the GitHub Pages URL on two real iPhones, create/join a room, roll and end several alternating turns.
- Confirm one phone cannot view the other's resource counts.
- Confirm the main game's existing routes remain unchanged.
