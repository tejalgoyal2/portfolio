-- The gratitude line's database (Cloudflare D1). The functions make these
-- tables themselves on first use; this file is the same schema, for reference
-- or to run by hand:  npx wrangler d1 execute gratitude --remote --file=db/gratitude.sql

-- Every word anyone has left. Approved ones are printed on the page; pending
-- ones (flagged by the check) wait for Tejal at /letters-admin.html.
CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at INTEGER NOT NULL,
  x REAL, -- where on the sheet it was stamped, 0–1 across
  y REAL  --                                  0–1 down
);
CREATE INDEX IF NOT EXISTS words_by_status ON words (status, created_at);

-- One word a day per visitor: a salted hash of (day, IP), never the IP itself.
-- Rows from earlier days are cleared as new ones come in.
CREATE TABLE IF NOT EXISTS daily (
  hash TEXT PRIMARY KEY,
  day TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS daily_by_day ON daily (day);

-- One row per printed word and how many people stamped it (the admin page's list).
CREATE TABLE IF NOT EXISTS tally (
  word TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  last INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tally_by_last ON tally (last);
