"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { asset } from "./SafeImage";

/** Centered phone-width page on the parchment background. */
export function Shell({
  children,
  className = "",
  withNav = false,
}: {
  children: ReactNode;
  className?: string;
  withNav?: boolean;
}) {
  return (
    <main
      className={`mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[calc(env(safe-area-inset-top)+16px)] ${
        withNav ? "pb-24" : "pb-[calc(env(safe-area-inset-bottom)+20px)]"
      } ${className}`}
    >
      {children}
    </main>
  );
}

/** "< TITLE" header row in letter-spaced small caps, like the mockups. */
export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="mb-5 flex items-center gap-2">
      <button
        onClick={() => router.back()}
        aria-label="Back"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-cream text-ink shadow-card"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <h1 className="flex-1 text-center text-sm font-bold uppercase tracking-[0.25em] text-ink">
        {title}
      </h1>
      <div className="flex h-10 w-10 items-center justify-center">{right}</div>
    </header>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-cream p-4 shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">
      {children}
    </p>
  );
}

const primary =
  "block w-full rounded-full bg-ink py-3.5 text-center text-sm font-bold uppercase tracking-[0.2em] text-cream shadow-card transition active:scale-[0.98] disabled:opacity-40";
const secondary =
  "block w-full rounded-full border border-ink/25 bg-cream py-3.5 text-center text-sm font-bold uppercase tracking-[0.2em] text-ink transition active:scale-[0.98] disabled:opacity-40";

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`${primary} ${props.className ?? ""}`} />;
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`${secondary} ${props.className ?? ""}`} />;
}

export function PrimaryLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${primary} ${className}`}>
      {children}
    </Link>
  );
}

export function SecondaryLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${secondary} ${className}`}>
      {children}
    </Link>
  );
}

/** Pill option used in selectors (players, mode, theme...). */
export function Chip({
  selected,
  onClick,
  children,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
        selected
          ? "border-ink bg-ink text-cream shadow-card"
          : "border-line bg-cream text-ink"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Real Hamsa Nomads PNG logo mark. */
export function HamsaLogo({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={asset("/hamsa-logo-mark.png")}
      alt="Hamsa Nomads"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

const NAV_ITEMS = [
  {
    href: "/",
    label: "Home",
    icon: (
      <path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-4v-4H8v4H4a1 1 0 0 1-1-1V9.5Z" />
    ),
  },
  {
    href: "/duo",
    label: "Online",
    icon: (
      <path d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm-7-7h14M10 3c-2 2.2-3 4.4-3 7s1 4.8 3 7c2-2.2 3-4.4 3-7s-1-4.8-3-7Z" />
    ),
  },
  {
    href: "/stats",
    label: "Stats",
    icon: (
      <path d="M4 16V9m4 7V4m4 12v-5m4 5V7" />
    ),
  },
  {
    href: "/collection",
    label: "Collection",
    icon: (
      <path d="M4 4h5v5H4V4Zm7 0h5v5h-5V4ZM4 11h5v5H4v-5Zm7 0h5v5h-5v-5Z" />
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <path d="M10 10a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 10 10Zm-6 7c.7-3 3-4.6 6-4.6s5.3 1.6 6 4.6" />
    ),
  },
];

export function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                isActive ? "text-rust" : "text-ink-soft"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
