// Totals for the /admin dashboard. Requires the admin passcode.
export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_KEY || request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const days = Number(new URL(request.url).searchParams.get("days")) || 0; // 0 = all time
  const since = days ? Math.floor(Date.now() / 1000) - days * 86400 : 0;
  const q = (sql) => env.DB.prepare(sql).bind(since);

  const [totals, items, retention, watched, daily, first] = await env.DB.batch([
    q("SELECT type, COUNT(*) AS n, COUNT(DISTINCT visitor) AS people FROM events WHERE ts >= ? GROUP BY type"),
    q("SELECT type, item, COUNT(*) AS n, COUNT(DISTINCT visitor) AS people FROM events WHERE ts >= ? AND type IN ('play', 'download') GROUP BY type, item"),
    q("SELECT item, value, COUNT(DISTINCT visitor) AS people FROM events WHERE ts >= ? AND type = 'progress' GROUP BY item, value"),
    q("SELECT item, SUM(best) AS total FROM (SELECT item, visitor, MAX(value) AS best FROM events WHERE ts >= ? AND type = 'progress' GROUP BY item, visitor) GROUP BY item"),
    q("SELECT day, COUNT(DISTINCT visitor) AS people, SUM(type = 'play') AS plays, SUM(type = 'download') AS downloads FROM events WHERE ts >= ? GROUP BY day ORDER BY day"),
    env.DB.prepare("SELECT MIN(ts) AS ts, COUNT(*) AS n FROM events"),
  ]);

  return Response.json(
    {
      since: first.results[0]?.ts || null,
      events: first.results[0]?.n || 0,
      totals: totals.results,
      items: items.results,
      retention: retention.results,
      watched: watched.results,
      daily: daily.results,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
