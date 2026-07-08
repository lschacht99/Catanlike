import { Card, SectionLabel, Shell, TopBar } from "@/components/ui";

interface Section {
  title: string;
  emoji: string;
  points: string[];
}

const SECTIONS: Section[] = [
  {
    title: "Standard game",
    emoji: "⬡",
    points: [
      "Roll two dice each turn. Tiles with that number pay resources to touching settlements (1) and cities (2).",
      "Spend resources to build roads, settlements, and cities, or buy journey cards.",
      "First to 10 victory points wins. Longest road and largest army are worth 2 each.",
      "Roll a 7 and the bandit blocks a tile and steals a card from a neighbor.",
    ],
  },
  {
    title: "Cities & Knights",
    emoji: "🛡️",
    points: [
      "Cities on ore, wool, or wood also make commodities (coin, cloth, book).",
      "Spend commodities to raise three city tracks; higher tracks draw stronger progress cards.",
      "Build knights, activate them with grain, and upgrade them to defend against raiders.",
      "An event die advances the raiders. When they arrive, total active knight strength is compared to the number of cities — win together or the weakest defender loses a city. Win at 13 points.",
    ],
  },
  {
    title: "Multiplayer & privacy",
    emoji: "👥",
    points: [
      "Pass-and-play: 2–4 players share one device with private hands.",
      "A pass-the-device screen hides the previous player's resources and cards between turns.",
      "You never see another player's exact resources — only how many cards they hold.",
      "Online play is supported when a game server is configured; otherwise the app says so plainly.",
    ],
  },
  {
    title: "Trading",
    emoji: "🤝",
    points: [
      "Trade 4:1 with the market, or send an offer to another player.",
      "When you propose a trade you pick what you give and request — you cannot see the other player's exact cards.",
      "The receiver privately accepts or refuses; resources move only after acceptance.",
      "Bots weigh each offer and may refuse — especially deals that only help the leader.",
    ],
  },
];

export default function RulesPage() {
  return (
    <Shell>
      <TopBar title="How to Play" />
      <p className="mb-4 text-sm text-ink-soft">
        A quick guide to Hamsa Nomads. Original wording — settle, trade, and
        build your nomadic legacy.
      </p>
      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <Card key={s.title}>
            <SectionLabel>
              <span className="mr-1 text-base">{s.emoji}</span> {s.title}
            </SectionLabel>
            <ul className="space-y-1.5">
              {s.points.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink">
                  <span className="text-rust">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
