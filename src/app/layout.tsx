import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
const withBasePath = (path: string) => `${basePath}${path}`;

export const metadata: Metadata = {
  title: "Hamsa Nomads",
  description:
    "Build · Trade · Explore — a mobile-first, themeable hex-board trading game. Pass-and-play or online with friends.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hamsa Nomads",
  },
  icons: { icon: withBasePath("/icon.svg"), apple: withBasePath("/icon.svg") },
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
