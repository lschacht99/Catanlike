import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
const withBasePath = (path: string) => `${basePath}${path}`;

export const metadata: Metadata = {
  title: "Hamsa Nomads",
  description:
    "Build · Trade · Explore — a mobile-first, themeable hex-board trading game. Pass-and-play or online with friends.",
  manifest: withBasePath("/manifest.webmanifest"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hamsa Catan",
  },
  // app/favicon.ico, app/icon.png and app/apple-icon.png are generated from
  // public/icon.svg (the single source of truth). The explicit entries below
  // exist because Next's file-convention links skip the GitHub Pages
  // basePath; duplicates on basePath-less builds are harmless.
  icons: {
    icon: [
      { url: withBasePath("/favicon.ico"), type: "image/x-icon", sizes: "16x16 32x32 48x48" },
      { url: withBasePath("/icon.svg"), type: "image/svg+xml" },
      { url: withBasePath("/icons/icon-192.png"), type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: withBasePath("/apple-icon.png"), sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f2ead9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-sand font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
