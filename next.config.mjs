const isGithubPages = process.env.GITHUB_PAGES === "true";
// Vercel sets VERCEL=1 at build time. Only there do we run a full Next.js
// build (serverless API routes enabled, e.g. /api/send-turn-notification);
// everywhere else — local `npm run build` and the GitHub Pages deploy — the
// app stays a pure static export exactly as before. `pageExtensions` is the
// lever that hides the .ts route handler from the static export (all pages/
// layouts in this app are .tsx, so only API route files match ".ts").
const isVercel = !!process.env.VERCEL;
const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const basePath = configuredBasePath && configuredBasePath !== "/" ? configuredBasePath.replace(/\/$/, "") : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isVercel ? {} : { output: "export" }),
  pageExtensions: isVercel ? ["tsx", "ts"] : ["tsx", "jsx"],
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isGithubPages && basePath
    ? {
        basePath,
        assetPrefix: `${basePath}/`,
      }
    : {}),
};

export default nextConfig;
