# Cities & Knights mode — implementation plan

State of the engine before this change: `variant: "cities-knights"` existed with
knight build/activate, 3-level city improvements paid in commodities, and six
thin progress cards — but no event die, no barbarian movement or attack, no
progress-card drawing, and cities produced 2 resources instead of commodities.

## Design

All expansion logic lives in `src/game/ck.ts` as pure functions so it can be
unit-tested without boardgame.io, and `moves.ts` only wires them in:

1. **Event die** (`rollEventDie`): rolled alongside the production dice when
   `G.variant === "cities-knights"`. Faces 1–3 advance the raiders
   (barbarians); 4/5/6 trigger a trade / politics / science progress event.
   Result stored in `G.lastEventDie` for the UI.
2. **Raider (barbarian) track**: `G.barbarianPosition` advances to
   `BARBARIAN_TRACK_LENGTH` (7). On arrival `resolveBarbarianAttack` compares
   total **active knight strength** (levels count) with the number of cities:
   - Defended: the sole strongest defender gains 1 hidden victory bonus point
     (`victoryBonus`); on a tie every top defender draws a progress card.
   - Overrun: every player owning a city whose knight strength is the weakest
     loses one city (downgraded to a settlement).
   - Afterwards the track resets and **all knights deactivate**.
3. **Progress events**: on a track event each player rolls a d6 and draws a
   card from that track's deck when the roll is at most their improvement
   level + 1. *Simplification:* the tabletop version uses the second red die
   and city gates; this keeps the same "higher improvements draw more" curve
   with one die. Hand limit 4 (oldest card discarded).
4. **Progress decks**: three per-track decks, 30 cards total, original names,
   every effect implemented in `playProgressCard` (free roads, 2:1 market
   rate for a turn, resource/commodity gains with choices, bandit move,
   free knight activation, targeted and global steals).
5. **Commodities**: in C&K games a **city** on an ore/wool/wood tile produces
   1 resource + 1 commodity (coin/cloth/book); on grain/brick it produces the
   classic 2 resources. Settlements always produce 1 resource.
6. **Knights**: build (on an own building corner — simplification of the
   road-network rule), activate for 1 grain, **upgrade** to a strong knight
   (level 2, costs 1 wool + 1 ore), and **deactivate** voluntarily. Strength
   used against raiders = sum of active knight levels.
7. **Scoring**: `victoryBonus` from successful defenses counts toward the
   13-point C&K victory target and is public.

Documented simplifications: no metropolis pieces, no city walls, no knight
displacement of the bandit adjacency rule, single event die instead of
event + red pair.
