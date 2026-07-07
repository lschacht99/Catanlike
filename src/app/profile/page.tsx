import Link from "next/link";
import HamsaPage from "@/components/HamsaPage";

export default function ProfilePage() {
  return (
    <HamsaPage title="Profile" kicker="Traveler card">
      <div className="rounded-[2rem] border border-[#ead8bb] bg-white/55 p-5 text-center shadow-sm">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#d6b77b] bg-[#fff9ec] font-serif text-2xl text-[#a85c3d]">HN</div>
        <h2 className="mt-4 font-serif text-2xl tracking-[0.12em]">Nomad Player</h2>
        <p className="mt-2 text-sm leading-6 text-[#65513a]">Choose your name in Game Studio and start a local pass-and-play journey.</p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-xs uppercase tracking-[0.1em] text-[#65513a]">
          <div className="rounded-2xl bg-[#fff9ec] p-3"><b className="block text-lg text-[#17324d]">0</b> Wins</div>
          <div className="rounded-2xl bg-[#fff9ec] p-3"><b className="block text-lg text-[#17324d]">7</b> Hexes</div>
          <div className="rounded-2xl bg-[#fff9ec] p-3"><b className="block text-lg text-[#17324d]">1</b> Theme</div>
        </div>
      </div>
      <Link href="/studio" className="mt-5 block rounded-full bg-[#17324d] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.2em] text-[#fff6df]">Edit in Studio</Link>
    </HamsaPage>
  );
}
