import { Origins, Server } from "boardgame.io/server";
import { HamsaNomadsGame } from "../src/game/game";

const port = Number(process.env.GAME_SERVER_PORT ?? 8000);

/**
 * Allowed browser origins. LOCALHOST covers dev on any port; add production
 * origins (comma-separated) via GAME_ORIGINS, e.g.
 *   GAME_ORIGINS=https://hamsa.example.com npm run server
 */
const origins: (string | RegExp)[] = [Origins.LOCALHOST];
if (process.env.GAME_ORIGINS) {
  origins.push(...process.env.GAME_ORIGINS.split(","));
}

const server = Server({ games: [HamsaNomadsGame], origins });

server.run(port, () => {
  console.log(`Hamsa Nomads game server listening on :${port}`);
});
