// Local preview only. Not part of the live site.
// Serves this folder, and maps /recordings/ to ../Assets/Recordings so the
// call replays play locally before they have a hosted link.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const RECORDINGS = path.join(__dirname, "..", "Assets", "Recordings");
const PORT = process.env.PORT || 4173;
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".pdf": "application/pdf", ".ttf": "font/ttf", ".mp4": "video/mp4", ".ics": "text/calendar; charset=utf-8" };

// Sample numbers so the /admin dashboard can be previewed locally. The real counts
// come from Cloudflare (functions/api) and only exist on the live site.
const SAMPLE_STATS = {
  since: 1791849600, events: 1420,
  totals: [{ type: "visit", n: 412, people: 188 }, { type: "play", n: 263, people: 121 }, { type: "download", n: 97, people: 71 }, { type: "remind_open", n: 84, people: 77 }, { type: "remind_google", n: 41, people: 40 }, { type: "remind_apple", n: 22, people: 22 }],
  items: [{ type: "play", item: "beyond-the-content", n: 96, people: 74 }, { type: "play", item: "content-creation-basics", n: 61, people: 44 }, { type: "play", item: "instagram-edits-tutorial", n: 58, people: 49 }, { type: "play", item: "kickoff-call", n: 30, people: 22 }, { type: "play", item: "five-habits", n: 18, people: 15 },
    { type: "download", item: "hook-templates-library", n: 41, people: 33 }, { type: "download", item: "content-posting-checklist", n: 29, people: 24 }, { type: "download", item: "ten-things-guide", n: 19, people: 16 }, { type: "download", item: "partner-content-guide", n: 8, people: 8 }],
  retention: [["beyond-the-content", [70, 61, 55, 48, 41, 36, 30, 26, 21, 14]], ["content-creation-basics", [40, 33, 27, 22, 18, 15, 12, 10, 8, 5]], ["instagram-edits-tutorial", [47, 44, 41, 39, 36, 33, 31, 28, 25, 19]], ["kickoff-call", [19, 14, 10, 8, 6, 5, 4, 3, 3, 2]], ["five-habits", [13, 11, 9, 8, 7, 6, 5, 4, 4, 3]]]
    .flatMap(([item, v]) => v.map((people, i) => ({ item, value: (i + 1) * 10, people }))),
  watched: [{ item: "beyond-the-content", total: 4020 }, { item: "content-creation-basics", total: 1900 }, { item: "instagram-edits-tutorial", total: 3430 }, { item: "kickoff-call", total: 740 }, { item: "five-habits", total: 700 }],
  daily: [31, 44, 58, 39, 27, 22, 35, 61, 48, 33, 29, 24, 37, 52].map((people, i) => ({ day: "2026-10-" + String(13 + i).padStart(2, "0"), people, plays: 0, downloads: 0 })),
};

http.createServer((req, res) => {
  if (req.url.startsWith("/api/stats")) return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(SAMPLE_STATS));
  if (req.url.startsWith("/api/event")) return res.writeHead(204).end();
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const base = p.startsWith("/recordings/") ? RECORDINGS : ROOT;
  const file = path.join(base, p.replace(/^\/recordings\//, "/"));
  if (!file.startsWith(base)) return res.writeHead(403).end();

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return res.writeHead(404).end("Not found");
    const head = { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
    if (m) {
      const start = m[1] ? +m[1] : st.size - +m[2];
      const end = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      res.writeHead(206, { ...head, "Content-Range": `bytes ${start}-${end}/${st.size}`, "Content-Length": end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...head, "Content-Length": st.size });
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, () => console.log(`Partner Portal preview: http://localhost:${PORT}`));
