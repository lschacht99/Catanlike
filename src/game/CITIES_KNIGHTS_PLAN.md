# Cities & Knights-style implementation plan

- Reuse the existing boardgame.io state and moves instead of replacing the app.
- Extend `GameState` with commodities, city improvements, progress decks, knight state, and a raider track.
- Keep standard mode behavior unchanged; branch production and special moves only when `variant === "cities-knights"`.
- Use original names and concise functional progress cards rather than copied commercial text.
- Keep UI mobile-first: compact status, tap-friendly track/knight/card buttons, and no hidden-opponent data leaks.
