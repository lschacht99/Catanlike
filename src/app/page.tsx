import Link from "next/link";

const menu = [
  { href: "/studio", title: "Play", body: "Start a new journey", primary: true },
  { href: "/solo", title: "Solo", body: "Challenge the desert" },
  { href: "/cpu", title: "Join Friends", body: "Trade and explore together" },
  { href: "/image-forge", title: "Travel Quests", body: "Make a board from a photo" },
];

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-[#f7efdf] px-5 pb-5 pt-6 text-[#17324d]">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#b77a4b_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="pointer-events-none absolute -left-8 top-24 h-44 w-44 rounded-full border border-[#c79b63]/40" />
      <div className="pointer-events-none absolute right-7 top-32 rotate-12 rounded-full border border-[#c79b63]/40 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-[#a2673f]">Istanbul</div>
      <div className="pointer-events-none absolute left-8 top-44 -rotate-12 rounded-full border border-[#c79b63]/40 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-[#a2673f]">Casablanca</div>

      <header className="relative z-10 flex items-center justify-between">
        <button className="grid h-11 w-11 place-items-center rounded-full border border-[#dec9aa] bg-white/55 text-xl shadow-sm">Menu</button>
        <span className="rounded-full border border-[#dec9aa] bg-white/55 px-3 py-2 text-xs uppercase tracking-[0.2em] text-[#8b6a3d]">Club</span>
      </header>

      <section className="relative z-10 mt-10 text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full border border-[#d6b77b] bg-[#fff9ec] text-xl text-[#a85c3d] shadow-sm">HN</div>
        <p className="text-[12px] uppercase tracking-[0.34em] text-[#a85c3d]">Build • Trade • Explore</p>
        <h1 className="mt-3 font-serif text-5xl leading-none tracking-[0.08em] text-[#17324d]">HAMSA</h1>
        <p className="mt-1 text-xl tracking-[0.45em] text-[#a85c3d]">NOMADS</p>
      </section>

      <section className="relative z-10 mt-8 overflow-hidden rounded-[2rem] border border-[#ead8bb] bg-white/45 p-5 shadow-[0_18px_60px_rgba(92,63,31,0.15)]">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#d9b54f]/25 blur-2xl" />
        <div className="relative h-48 overflow-hidden rounded-[1.5rem] bg-[#f1ddbd]">
          <div className="absolute inset-x-0 bottom-0 h-24 bg-[#d5c197]" />
          <div className="absolute left-5 top-14 h-28 w-28 rounded-t-[4rem] bg-[#fff6e4] shadow-md" />
          <div className="absolute left-12 top-20 h-12 w-7 rounded-t-full bg-[#a85c3d]" />
          <div className="absolute left-28 top-20 h-20 w-24 rounded-t-[3rem] bg-[#fbf1de] shadow-md" />
          <div className="absolute left-40 top-28 h-10 w-6 rounded-t-full bg-[#17324d]" />
          <div className="absolute right-8 top-10 h-28 w-20 rounded-t-full bg-[#fff6e4] shadow-md" />
          <div className="absolute bottom-5 left-0 h-9 w-full bg-[#76a7aa]/60" />
        </div>
        <div className="mt-6 text-center">
          <h2 className="font-serif text-3xl tracking-[0.16em] text-[#17324d]">A JOURNEY</h2>
          <h2 className="font-serif text-3xl tracking-[0.18em] text-[#a85c3d]">YOU BUILD</h2>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#65513a]">Settle new lands, trade resources, and build your nomadic legacy.</p>
        </div>
        <Link href="/studio" className="mt-6 block rounded-full bg-[#17324d] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.24em] text-[#fff6df] shadow-[0_14px_30px_rgba(23,50,77,0.25)]">Play</Link>
      </section>

      <nav className="relative z-10 mt-5 grid grid-cols-2 gap-3">
        {menu.map((item) => (
          <Link key={item.href} href={item.href} className={`rounded-3xl border p-4 shadow-sm ${item.primary ? "col-span-2 border-[#17324d]/20 bg-[#17324d] text-[#fff6df]" : "border-[#ead8bb] bg-white/55 text-[#17324d]"}`}>
            <span className="block font-serif text-lg">{item.title}</span>
            <span className="mt-1 block text-xs opacity-70">{item.body}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
