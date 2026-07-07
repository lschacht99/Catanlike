import Link from "next/link";
import HamsaBottomNav from "./HamsaBottomNav";

interface HamsaPageProps {
  title: string;
  kicker?: string;
  children: React.ReactNode;
  backHref?: string;
}

export default function HamsaPage({ title, kicker, children, backHref = "/" }: HamsaPageProps) {
  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-md overflow-hidden bg-[#f7efdf] px-5 pb-28 pt-6 text-[#17324d]">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(#b77a4b_1px,transparent_1px)] [background-size:26px_26px]" />
      <header className="relative z-10 mb-7 flex items-center justify-between">
        <Link href={backHref} className="grid h-11 w-11 place-items-center rounded-full border border-[#dec9aa] bg-white/55 text-xl shadow-sm">‹</Link>
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#a85c3d]">{kicker ?? "Hamsa Nomads"}</div>
          <h1 className="font-serif text-2xl tracking-[0.12em]">{title}</h1>
        </div>
        <Link href="/studio" className="grid h-11 w-11 place-items-center rounded-full border border-[#dec9aa] bg-white/55 text-xs font-black shadow-sm">Play</Link>
      </header>
      <section className="relative z-10">{children}</section>
      <HamsaBottomNav />
    </main>
  );
}
