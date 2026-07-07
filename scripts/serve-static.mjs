import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";

const root = resolve(process.env.STATIC_DIR ?? "out");
const port = Number(process.env.PORT ?? 3000);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function candidateFile(relative) {
  let file = join(root, relative);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  return file;
}

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const relative = normalize(decoded).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  let file = candidateFile(relative);

  // GitHub Pages project sites mount ./out at /<repo-name>/. Strip one
  // leading segment so local previews can use the same project-site URLs.
  if (!existsSync(file) && relative) {
    file = candidateFile(relative.split(/[\\/]/).slice(1).join("/"));
  }

  if (!existsSync(file)) file = join(root, "404.html");
  return file.startsWith(root) ? file : join(root, "404.html");
}

createServer((req, res) => {
  const file = safeFilePath(req.url ?? "/");
  res.setHeader("content-type", types[extname(file)] ?? "application/octet-stream");
  createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
