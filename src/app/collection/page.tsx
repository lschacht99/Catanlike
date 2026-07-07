import HamsaPage from "@/components/HamsaPage";

const hexes = [
  ["Olive Route", "/hex-olive-route.svg", "wood"],
  ["Terracotta Stop", "/hex-terracotta-stop.svg", "brick"],
  ["Market Harvest", "/hex-market-harvest.svg", "grain"],
  ["Tent Weave", "/hex-tent-weave.svg", "wool"],
  ["Compass Brass", "/hex-compass-brass.svg", "ore"],
  ["Passport Sands", "/hex-passport-sands.svg", "desert"],
  ["Coastal Sea", "/hex-coastal-sea.svg", "sea"],
];

export default function CollectionPage() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <HamsaPage title="Collection" kicker="Hex package">
      <div className="rounded-[2rem] border border-[#ead8bb] bg-white/55 p-5 shadow-sm">
        <p className="text-sm leading-6 text-[#65513a]">Complete Hamsa Nomads hex package. These assets are stored in public files and can be reused by themes, maps, and future boards.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {hexes.map(([name, src, key]) => (
            <div key={name} className="rounded-3xl border border-[#ead8bb] bg-[#fff9ec] p-3 text-center shadow-sm">
              <img src={`${base}${src}`} alt={name} className="mx-auto aspect-square w-full max-w-[130px]" />
              <h2 className="mt-2 font-serif text-base tracking-[0.08em]">{name}</h2>
              <p className="text-xs uppercase tracking-[0.14em] text-[#a85c3d]">{key}</p>
            </div>
          ))}
        </div>
      </div>
    </HamsaPage>
  );
}
