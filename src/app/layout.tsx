import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
const withBasePath = (path: string) => `${basePath}${path}`;

export const metadata: Metadata = {
  title: "Hamsa Nomads",
  description: "A warm travel-coded hex trading game: build, trade, explore, and play pass-and-play on one phone.",
  manifest: withBasePath("/manifest.webmanifest"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hamsa Nomads",
  },
  icons: { icon: withBasePath("/icon.svg"), apple: withBasePath("/icon.svg") },
};

export const viewport: Viewport = {
  themeColor: "#f7efdf",
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
      <body className="bg-[#f7efdf] font-sans text-[#17324d] antialiased">
        {children}
      </body>
    </html>
  );
}
