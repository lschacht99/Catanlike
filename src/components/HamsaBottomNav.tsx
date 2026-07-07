import Link from "next/link";

const nav = [
  { href: "/", label: "Home" },
  { href: "/journal", label: "Journal" },
  { href: "/collection", label: "Collection" },
  { href: "/profile", label: "Profile" },
];

export default function HamsaBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-md grid-cols-4 border-t border-[#ead8bb] bg-[#fff9ec]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[#17324d] backdrop-blur">
      {nav.map((item) => (
        <Link key={item.href} href={item.href} className="rounded-2xl px-2 py-2 hover:bg-[#f1ddbd]">
          <span className="block text-lg">{item.label.slice(0, 1)}</span>
          <span className="block">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
