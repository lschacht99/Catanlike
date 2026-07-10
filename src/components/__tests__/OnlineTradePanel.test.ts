import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The online trade panel's actual behavior (role-based content, disabled
 * Accept, wiring) is covered by the pure onlineTrade.ts tests and by the
 * moves.ts accept/refuse/cancel/stale-clear tests it's built on. This file
 * proves the specific regression the bug report described: the local
 * pass-and-play "hand the device over" curtain must never appear in the
 * online panel. Checked as a source-text audit rather than a rendered-DOM
 * test — this vitest setup's SSR transform doesn't parse JSX in .tsx files
 * (a rolldown/vite tooling limitation unrelated to this fix), so this reads
 * the actual shipped component source instead of guessing what it renders.
 */

const HANDOFF_PHRASES = ["pass the device", "hand it to", "show my turn", "private resources and cards"];

function read(relPath: string): string {
  return readFileSync(path.resolve(__dirname, "../..", relPath), "utf8");
}

/** Strips comments so the audit checks user-facing JSX text, not code prose
 * (this file's own doc comments legitimately name the phrases they forbid). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("OnlineTradePanel never shows the local pass-and-play handoff text", () => {
  const source = stripComments(read("components/OnlineTradePanel.tsx"));

  it.each(HANDOFF_PHRASES)("does not contain %j", (phrase) => {
    expect(source.toLowerCase()).not.toContain(phrase);
  });

  it("never imports the local-only handoff components", () => {
    expect(source).not.toMatch(/PrivacyOverlay/);
    expect(source).not.toMatch(/from ["']\.\/TradeReview["']/);
  });

  it("addresses the responder directly instead of a generic handoff prompt", () => {
    expect(source).toMatch(/Trade offer from/);
    expect(source).toMatch(/Waiting for/);
  });
});

describe("GameBoardPlay routes online vs local trade UI correctly", () => {
  const source = read("components/GameBoardPlay.tsx");

  it("only renders the local handoff/review flow when NOT online (handoffGate defaulting true)", () => {
    // The PrivacyOverlay/TradeReview branch must be gated behind the local
    // (non-online) path, not shown unconditionally whenever a trade is
    // pending — that gating is exactly what caused the original bug (every
    // device saw the same "pass the device" curtain regardless of mode).
    const onlineBranch = source.match(/onlineMode \? \(([\s\S]*?)\) : \(/)?.[1] ?? "";
    const localBranch = source.slice(source.indexOf(") : (")).slice(0, 800);
    expect(onlineBranch).toContain("OnlineTradePanel");
    expect(onlineBranch).not.toContain("PrivacyOverlay");
    expect(localBranch).toContain("PrivacyOverlay");
  });

  it("passes cancelTrade through for the online proposer's Cancel button", () => {
    expect(source).toMatch(/onCancel=\{\(\) => boardMoves\.cancelTrade\?\.\(\)\}/);
  });
});
