// Records one anonymous usage event. Called by the site; never returns data.
const TYPES = new Set(["visit", "play", "progress", "download", "remind_open", "remind_google", "remind_apple"]);

export async function onRequestPost({ request, env }) {
  let e;
  try {
    e = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const visitor = String(e.v || "");
  const type = String(e.type || "");
  const item = String(e.item || "");
  const value = Math.round(Number(e.value) || 0);
  if (!TYPES.has(type) || !/^[a-z0-9-]{8,40}$/.test(visitor) || !/^[a-z0-9-]{0,64}$/.test(item) || value < 0 || value > 100) {
    return new Response(null, { status: 400 });
  }
  const now = new Date();
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  await env.DB.prepare("INSERT INTO events (ts, day, visitor, type, item, value) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(Math.floor(now.getTime() / 1000), day, visitor, type, item, value)
    .run();
  return new Response(null, { status: 204 });
}
