import Link from "next/link";

const menu = [
  { href: "/new", title: "Play", subtitle: "Start a pass-and-play game", icon: "🎲" },
  { href: "/forge", title: "Map Forge", subtitle: "Generate & save balanced boards", icon: "🗺️" },
  { href: "/themes", title: "Themes", subtitle: "Reskin every resource & tile", icon: "🎨" },
  { href: "/boards", title: "Saved Boards", subtitle: "Replay your favorite maps", icon: "💾" },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-10 text-center">
        <p className="text-6xl">⬡</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Hex Isles</h1>
        <p className="mt-2 text-sm text-white/60">
          Settle, trade, and build across themeable hex islands.
        </p>
      </div>

      <nav className="space-y-3">
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition active:scale-[0.98] active:bg-white/10"
          >
            <span className="text-3xl">{item.icon}</span>
            <span>
              <span className="block text-lg font-bold">{item.title}</span>
              <span className="block text-xs text-white/60">{item.subtitle}</span>
            </span>
          </Link>
        ))}
      </nav>

      <p className="mt-10 text-center text-[11px] leading-relaxed text-white/35">
        An original game inspired by classic hex resource-trading mechanics.
        Not affiliated with or endorsed by any commercial board game.
      </p>
    </main>
  );
}
