import Link from "next/link";
import HamsaPage from "@/components/HamsaPage";

const steps = [
  ["Settle", "Place two camps and two routes during setup."],
  ["Roll", "Roll dice to collect resources from matching hex numbers."],
  ["Trade", "Trade with the bank or another seat."],
  ["Build", "Build routes, camps, cities, and scouts."],
  ["Cities", "Cities can create commodities in the advanced mode."],
  ["Score", "Reach the victory point target first."],
];

export default function HowToPlayPage() {
  return (
    <HamsaPage title="How to Play" kicker="Rules guide">
      <div className="rounded-[2rem] border border-[#ead8bb] bg-white/55 p-5 shadow-sm">
        <div className="space-y-3">
          {steps.map(([title, body], index) => (
            <div key={title} className="rounded-2xl border border-[#ead8bb] bg-[#fff9ec] p-4">
              <div className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#17324d] text-xs font-bold text-[#fff6df]">{index + 1}</span>
                <div>
                  <h2 className="font-serif text-lg tracking-[0.08em]">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#65513a]">{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Link href="/studio" className="mt-5 block rounded-full bg-[#17324d] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.2em] text-[#fff6df]">Play</Link>
    </HamsaPage>
  );
}
