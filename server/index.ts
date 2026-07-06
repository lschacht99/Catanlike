import { createServer } from "node:http";
import { handleThemeRequest } from "./gemini/theme";

const server = createServer((req, res) => {
  res.setHeader("access-control-allow-origin", process.env.CLIENT_ORIGIN ?? "http://localhost:3000");
  res.setHeader("access-control-allow-methods", "POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method === "POST" && req.url === "/api/gemini/theme") return void handleThemeRequest(req, res);
  if (req.url === "/health") { res.writeHead(200); res.end("ok"); return; }
  res.writeHead(404); res.end("not found");
});

server.listen(Number(process.env.PORT ?? 8787), () => console.log("Hex Isles API listening"));
