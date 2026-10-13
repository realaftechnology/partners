-- Anonymous usage events for the partner portal. No names, emails or IP addresses.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,          -- unix seconds
  day TEXT NOT NULL,            -- YYYY-MM-DD in US Eastern time
  visitor TEXT NOT NULL,        -- random per-browser id
  type TEXT NOT NULL,           -- visit | play | progress | download | remind_open | remind_google | remind_apple
  item TEXT NOT NULL DEFAULT '',-- resource id from content.js
  value INTEGER NOT NULL DEFAULT 0 -- progress: percent of the video watched (10..100)
);
CREATE INDEX IF NOT EXISTS events_ts ON events (ts);
CREATE INDEX IF NOT EXISTS events_type_item ON events (type, item);
