import { Card, Shell } from "@/components/ui";
import { TopBarStatic } from "./topbar";

const SECTIONS = [
  {
    icon: "🎯",
    title: "The Goal",
    body: "Be the first to reach 10 legacy points. Villages are worth 1, cities 2, and the Longest Route and Largest Army banners 2 each. Some journey cards hide extra points.",
  },
  {
    icon: "🗺️",
    title: "Setting Out",
    body: "In turn order (then reversed), each nomad places two villages with a road each. Your second village pays out one resource from each tile it touches.",
  },
  {
    icon: "🎲",
    title: "The Turns",
    body: "Roll two dice. Every tile with that number pays its resource to villages (1) and cities (2) on its corners. Then build, trade, and play one journey card if you wish.",
  },
  {
    icon: "🧱",
    title: "Build",
    body: "Roads connect your network. Villages must sit two crossings apart and touch your roads. Upgrade a village to a city for double harvests.",
  },
  {
    icon: "🐪",
    title: "Trade",
    body: "Trade 4 identical resources with the market, or propose player trades. Exact rival resources and private cards stay hidden; pass-and-play asks the receiver before accepting.",
  },
  {
    icon: "👥",
    title: "Multiplayer",
    body: "Local multiplayer uses named players on one device with a privacy screen between turns. True online play requires running the server, so static Pages does not pretend to host rooms.",
  },
  {
    icon: "🏙️",
    title: "Cities & Knights Mode",
    body: "Cities can make commodities, upgrade trade/politics/science tracks, train scouts, draw progress cards, and defend against raider attacks.",
  },
  {
    icon: "🃏",
    title: "Journey Cards",
    body: "Buy a card for grain + wool + ore. Knights move the bandit and count toward the Largest Army. Others grant free roads, resources, or hidden points. One card per turn, never the turn you bought it.",
  },
  {
    icon: "👺",
    title: "The Bandit",
    body: "On a 7 nothing is harvested. The roller moves the bandit to any tile, blocking it, and steals a random card from a neighbor there.",
  },
];

export default function HowToPlayPage() {
  return (
    <Shell>
      <TopBarStatic title="How to Play" />
      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <Card key={s.title} className="flex gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-parchment text-xl">
              {s.icon}
            </span>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-center text-[10px] text-ink-faint">
        An original ruleset inspired by classic hex trading games.
      </p>
    </Shell>
  );
}
