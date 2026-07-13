import { describe, expect, it } from "vitest";
import { GAME_ASSETS, visualsForTheme } from "../assetManifest";
import { assetUrl, spriteUseUrl } from "../assetUrl";

const terrainKeys = ["wood", "brick", "grain", "wool", "ore", "desert", "sea"] as const;

describe("game asset manifest", () => {
  it("provides every terrain for all production themes", () => {
    for (const theme of ["classic", "hamsa", "israel"] as const) {
      for (const key of terrainKeys) {
        expect(GAME_ASSETS[theme].terrain[key]).toBe(`/assets/game/themes/${theme}/hex/${key}.svg`);
      }
    }
  });

  it("keeps the visual packs distinct", () => {
    expect(GAME_ASSETS.classic.terrain.wood).not.toBe(GAME_ASSETS.hamsa.terrain.wood);
    expect(GAME_ASSETS.hamsa.water.deep).not.toBe(GAME_ASSETS.israel.water.deep);
    expect(GAME_ASSETS.classic.pieces.architecture).toBe("classic");
    expect(GAME_ASSETS.hamsa.pieces.architecture).toBe("medina");
    expect(GAME_ASSETS.israel.pieces.architecture).toBe("limestone");
  });

  it("falls back safely for old and custom themes", () => {
    expect(visualsForTheme("legacy-custom")).toBe(GAME_ASSETS.classic);
  });
});

describe("assetUrl", () => {
  it("resolves root assets without a base path", () => {
    expect(assetUrl("assets/game/manifest.json", "")).toBe("/assets/game/manifest.json");
  });

  it("resolves GitHub Pages assets exactly once", () => {
    expect(assetUrl("/assets/game/manifest.json", "/Catanlike")).toBe("/Catanlike/assets/game/manifest.json");
    expect(assetUrl("/Catanlike/assets/game/manifest.json", "/Catanlike")).toBe("/Catanlike/assets/game/manifest.json");
  });

  it("leaves external and data URLs untouched", () => {
    expect(assetUrl("https://example.com/tile.svg", "/Catanlike")).toBe("https://example.com/tile.svg");
    expect(assetUrl("data:image/svg+xml,x", "/Catanlike")).toBe("data:image/svg+xml,x");
  });

  it("resolves sprite fragments with the same base path", () => {
    expect(spriteUseUrl("wood", "/Catanlike")).toBe("/Catanlike/assets/game/sprites/game-icons.svg#wood");
  });
});
