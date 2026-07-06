import Link from "next/link";

const links = [
  { href: "/solo", title: "Solo mode", body: "Play alone against three CPU seats." },
  { href: "/studio", title: "Play now", body: "Names, variants, solo, and 2 humans + 2 CPU setup." },
  { href: "/cpu", title: "CPU quick game", body: "Fast launch into a mixed human/bot match." },
  { href: "/forge", title: "Map Forge", body: "Generate balanced boards and save your favorites." },
  { href: "/image-forge", title: "Image Forge", body: "Upload a photo and spin a matching travel palette." },
  { href: "/themes", title: "Themes", body: "Japan, Israel, Jewish Journey, and Hamsa Nomads." },
  { href: "/boards", title: "Saved boards", body: "Replay boards you already liked." },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-8">
      <header className="mb-8 text-center">
        <p className="mb-2 text-sm uppercase tracking-[0.25em] text-yellow-300/80">
          Hex Isles
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white">
          Flat board. 3D pieces. Ready to play.
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/65">
          Mobile-first island trading with stunning themes, custom names, bots, and new special modes.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        {links.map((link, index) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-yellow-400/40 hover:bg-white/10 ${index === 0 ? "col-span-2 border-yellow-400/25 bg-yellow-400/10" : ""}`}
          >
            <p className="text-base font-bold text-white">{link.title}</p>
            <p className="mt-1 text-xs leading-5 text-white/60">{link.body}</p>
          </Link>
        ))}
      </section>

      <footer className="mt-8 text-center text-xs text-white/35">
        Includes solo mode, Japan, Israel, Jewish Journey, Hamsa Nomads, and Cities & Knights Lite.
      </footer>
    </main>
  );
}
