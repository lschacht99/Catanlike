"use client";

import { useState } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";

/** Prefix a /public path with the GitHub-Pages base path when configured. */
export function asset(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Lazy, layout-shift-free image with a graceful fallback. The wrapper reserves
 * space via `aspectRatio`, so nothing jumps while the image loads or if it
 * fails. On error a soft parchment gradient with an emoji stands in.
 */
export default function SafeImage({
  src,
  alt,
  aspectRatio = "16 / 10",
  fallbackEmoji = "🗺️",
  className = "",
  eager = false,
}: {
  src: string;
  alt: string;
  aspectRatio?: string;
  fallbackEmoji?: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={`relative overflow-hidden bg-[#e7d8ba] ${className}`}
      style={{ aspectRatio }}
    >
      {!failed ? (
        <img
          src={asset(src)}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f3ead6] to-[#d8c39a] text-4xl">
          <span aria-hidden>{fallbackEmoji}</span>
        </div>
      )}
    </div>
  );
}
