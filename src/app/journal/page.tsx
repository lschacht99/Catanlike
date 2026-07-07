import Link from "next/link";
import HamsaPage from "@/components/HamsaPage";

const entries = [
  ["First Camp", "Place your first settlement and route."],
  ["Market Trade", "Trade with the bank or another traveler."],
  ["Medina Builder", "Upgrade a camp into a city."],
  ["Scout Watch", "Train and activate a knight in Cities and Knights."],
];

export default function JournalPage() {
  return (
    <HamsaPage title="Journal" kicker="Your route">
      <div className="rounded-[2rem] border border-[#ead8bb] bg-white/55 p-5 shadow-sm">
        <p className="text-sm leading-6 text-[#65513a]">Track the story of the match: camps, routes, trades, raiders, cards, and victories.</p>
        <div className="mt-5 space-y-3">
          {entries.map(([title, body], index) => (
            <div key={title} className="rounded-2xl border border-[#ead8bb] bg-[#fff9ec] p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg tracking-[0.08em]">{title}</h2>
                <span className="rounded-full bg-[#17324d] px-3 py-1 text-xs font-bold text-[#fff6df]">{index + 1}</span>
              </div>
              <p className="mt-1 text-sm text-[#65513a]">{body}</p>
            </div>
          ))}
        </div>
      </div>
      <Link href="/studio" className="mt-5 block rounded-full bg-[#17324d] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.2em] text-[#fff6df]">Start a journey</Link>
    </HamsaPage>
  );
}
