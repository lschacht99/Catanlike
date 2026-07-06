import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
const withBasePath = (path: string) => `${basePath}${path}`;

export const metadata: Metadata = {
  title: "Hex Isles",
  description:
    "A mobile-first, themeable hex-board resource trading game. Pass-and-play with friends on one phone.",
  manifest: withBasePath("/manifest.webmanifest"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hex Isles",
  },
  icons: { icon: withBasePath("/icon.svg"), apple: withBasePath("/icon.svg") },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
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
      <body className="bg-slate-950 font-sans text-white antialiased">
        {children}
      </body>
    </html>
  );
}
