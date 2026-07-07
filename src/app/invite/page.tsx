import Link from "next/link";
import HamsaPage from "@/components/HamsaPage";

export default function InvitePage() {
  return (
    <HamsaPage title="Invite" kicker="Local play">
      <div className="rounded-[2rem] border border-[#ead8bb] bg-white/55 p-5 shadow-sm">
        <h2 className="font-serif text-2xl tracking-[0.12em]">Gather travelers</h2>
        <p className="mt-3 text-sm leading-6 text-[#65513a]">This game is built for pass-and-play on one phone. Pick two, three, or four players, or use CPU seats.</p>
        <div className="mt-5 grid gap-3">
          <Link href="/studio" className="rounded-2xl bg-[#17324d] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.18em] text-[#fff6df]">Open Studio</Link>
          <Link href="/solo" className="rounded-2xl border border-[#ead8bb] bg-[#fff9ec] px-5 py-4 text-center text-sm font-bold uppercase tracking-[0.16em]">Solo vs CPU</Link>
          <Link href="/cpu" className="rounded-2xl border border-[#ead8bb] bg-[#fff9ec] px-5 py-4 text-center text-sm font-bold uppercase tracking-[0.16em]">CPU Quick Game</Link>
        </div>
      </div>
    </HamsaPage>
  );
}
