// Shared by the gratitude line's functions (functions/api/gratitude), kept
// outside functions/ so it's never mistaken for a route.

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
      ...headers,
    },
  });

/** One or two words, letters only (any language), up to 24 characters; lower-cased so the same word merges. */
export function clean(input) {
  if (typeof input !== 'string') return null;
  const w = input.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!w || w.length > 24) return null;
  if (w.split(' ').length > 2) return null;
  if (!/^[\p{L}\p{M}]+(?:[ '’-][\p{L}\p{M}]+)*$/u.test(w)) return null;
  return w;
}

// A short list of words that never go up without a look first. Workers AI
// (Llama Guard) does the real checking; this catches the obvious ones fast.
const NOPE = ['fuck', 'shit', 'cunt', 'bitch', 'dick', 'cock', 'pussy', 'whore', 'slut', 'nazi', 'rape', 'porn', 'kill'];
export const listFlags = (w) => NOPE.some((n) => w.replace(/[^a-z]/g, '').includes(n));

/** 'safe' | 'unsafe' | 'unknown' (no AI binding, or it failed). */
export async function aiCheck(env, word) {
  if (!env.AI) return 'unknown';
  try {
    const out = await env.AI.run('@cf/meta/llama-guard-3-8b', {
      messages: [{ role: 'user', content: `What are you grateful for today? "${word}"` }],
    });
    const text = String(out?.response ?? out?.result?.response ?? '').trim().toLowerCase();
    if (text.startsWith('safe')) return 'safe';
    if (text.startsWith('unsafe')) return 'unsafe';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time comparison for the admin secret. */
export function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Where the line may be written from: the live site and its Pages previews.
const HOSTS = ['tgoyal.me', 'www.tgoyal.me', 'portfolio-7en.pages.dev'];
export const hostAllowed = (h) =>
  typeof h === 'string' && (HOSTS.includes(h) || h.endsWith('.portfolio-7en.pages.dev'));

/** The part of an address that's one person's: all of an IPv4 address, the first 64 bits of an IPv6 one. */
export function addressKey(ip) {
  if (!ip.includes(':')) return ip;
  const [head, tail = ''] = ip.toLowerCase().split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const full = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
  return full.slice(0, 4).map((g) => g.padStart(4, '0')).join(':') + '::/64';
}

/** One more of a word on the line (the tally keeps one row per word, so reading the line stays cheap). */
export const addToTally = (env, word, at) =>
  env.DB.prepare('INSERT INTO tally (word, n, last) VALUES (?1, 1, ?2) ON CONFLICT(word) DO UPDATE SET n = n + 1, last = excluded.last')
    .bind(word, at)
    .run();

// The tables, made on first use (the same as db/gratitude.sql), so a fresh
// database needs no setup step. The tally is filled from the words once, if
// it's new.
let ready = null;
export const ensure = (env) =>
  (ready ||= env.DB.batch([
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS words (id INTEGER PRIMARY KEY AUTOINCREMENT, word TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL)"
    ),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS words_by_status ON words (status, created_at)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS daily (hash TEXT PRIMARY KEY, day TEXT NOT NULL)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS daily_by_day ON daily (day)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS tally (word TEXT PRIMARY KEY, n INTEGER NOT NULL, last INTEGER NOT NULL)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS tally_by_last ON tally (last)'),
    env.DB.prepare(
      "INSERT INTO tally (word, n, last) SELECT word, COUNT(*), MAX(created_at) FROM words WHERE status = 'approved' AND NOT EXISTS (SELECT 1 FROM tally) GROUP BY word"
    ),
  ]).catch((e) => {
    ready = null;
    throw e;
  }));
