// Local preview only. Not part of the live site.
// Serves this folder, and maps /recordings/ to ../Assets/Recordings so the
// call replays play locally before they have a hosted link.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const RECORDINGS = path.join(__dirname, "..", "Assets", "Recordings");
const PORT = process.env.PORT || 4173;
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".pdf": "application/pdf", ".ttf": "font/ttf", ".mp4": "video/mp4" };

http.createServer((req, res) => {
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
