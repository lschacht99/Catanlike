import Link from "next/link";
import HamsaBottomNav from "@/components/HamsaBottomNav";

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-[#f7efdf] px-6 pb-28 pt-7 text-[#17324d]">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(#b77a4b_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="pointer-events-none absolute left-8 top-52 h-px w-64 rotate-12 border-t border-dashed border-[#c79b63]/70" />
      <div className="pointer-events-none absolute left-9 top-44 rounded-full border border-[#d7bd91] px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-[#b77a4b]">Casablanca</div>
      <div className="pointer-events-none absolute right-8 top-44 rotate-12 rounded-full border border-[#d7bd91] px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-[#b77a4b]">Istanbul</div>

      <header className="relative z-10 flex justify-between">
        <Link href="/profile" className="grid h-11 w-11 place-items-center rounded-full border border-[#dec9aa] bg-white/55 text-sm shadow-sm">Set</Link>
        <Link href="/collection" className="grid h-11 w-11 place-items-center rounded-full border border-[#dec9aa] bg-white/55 text-sm shadow-sm">HN</Link>
      </header>

      <section className="relative z-10 mt-9 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#d6b77b] bg-[#fff9ec] text-xl font-serif text-[#a85c3d] shadow-sm">HN</div>
        <h1 className="mt-6 font-serif text-5xl leading-none tracking-[0.12em]">HAMSA</h1>
        <p className="mt-1 text-xl tracking-[0.45em] text-[#a85c3d]">NOMADS</p>
        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#65513a]">Build • Trade • Explore</p>
      </section>

      <section className="relative z-10 mt-8 overflow-hidden rounded-[2rem] border border-[#ead8bb] bg-white/45 p-4 shadow-[0_18px_60px_rgba(92,63,31,0.15)]">
        <div className="relative h-52 overflow-hidden rounded-[1.5rem] bg-[#f1ddbd]">
          <div className="absolute inset-x-0 bottom-0 h-24 bg-[#d5c197]" />
          <div className="absolute bottom-8 left-3 h-20 w-20 rounded-t-[3rem] bg-[#fff6e4] shadow-md" />
          <div className="absolute bottom-8 left-28 h-32 w-28 rounded-t-[4rem] bg-[#fff6e4] shadow-md" />
          <div className="absolute bottom-8 right-7 h-24 w-20 rounded-t-[3rem] bg-[#fff6e4] shadow-md" />
          <div className="absolute bottom-8 left-40 h-12 w-7 rounded-t-full bg-[#a85c3d]" />
          <div className="absolute bottom-8 left-16 h-10 w-6 rounded-t-full bg-[#17324d]" />
          <div className="absolute bottom-3 left-0 h-9 w-full bg-[#76a7aa]/60" />
          <div className="absolute bottom-8 right-4 h-32 w-9 rounded-full bg-[#758b49]" />
        </div>
        <div className="mt-6 text-center">
          <h2 className="font-serif text-3xl tracking-[0.16em]">A JOURNEY</h2>
          <h2 className="font-serif text-3xl tracking-[0.18em] text-[#a85c3d]">YOU BUILD</h2>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#65513a]">Settle new lands, trade resources, and build your nomadic legacy.</p>
        </div>
        <Link href="/studio" className="mt-6 block rounded-full bg-[#17324d] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.24em] text-[#fff6df] shadow-[0_14px_30px_rgba(23,50,77,0.25)]">Play</Link>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link href="/invite" className="rounded-2xl border border-[#ead8bb] bg-white/55 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em]">Invite Friends</Link>
          <Link href="/how-to-play" className="rounded-2xl border border-[#ead8bb] bg-white/55 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em]">How to Play</Link>
        </div>
      </section>

      <HamsaBottomNav />
    </main>
  );
}
