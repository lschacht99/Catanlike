"use client";

import type { ReactNode } from "react";

/** Bottom sheet on parchment, matching the mockups' rounded cards. */
export default function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-line bg-sand px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/20" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-cream text-ink-soft"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
