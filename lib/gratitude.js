// Shared by the gratitude sheet's functions (functions/api/gratitude), kept
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
  // nothing invisible: fillers that print as blank stamps, joiners and selectors that make
  // a look-alike copy of a word (all "default ignorable"), and at least one letter that shows
  if (/\p{Default_Ignorable_Code_Point}/u.test(w)) return null;
  // accents, yes; a tower of stacked marks ("zalgo" text spilling over the sheet), no
  if (/\p{M}{3,}/u.test(w) || (w.match(/\p{M}/gu) || []).length > 8) return null;
  return w;
}

// Words that never go up without a look first. Workers AI (Llama Guard) checks
// for harm, but not for swearing or insults, so this list does that part. It
// holds a word for review (it never rejects outright), so a harmless word that
// happens to contain one of these ("skills", "grapes") just waits a little.
const NOPE = [
  'fuck', 'fuk', 'shit', 'cunt', 'bitch', 'dick', 'cock', 'pussy', 'whore', 'slut', 'nazi', 'rape', 'porn', 'kill',
  'asshole', 'arsehole', 'wanker', 'bastard', 'twat', 'prick', 'fag', 'nigg', 'retard', 'piss', 'bollock', 'tits',
  'sex', 'nude', 'hitler', 'kys', 'suicide',
];
// letters from other alphabets that pass for Latin ones (Cyrillic and Greek mostly)
const LOOKALIKE = {
  а: 'a', в: 'b', е: 'e', ё: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x', ѕ: 's', і: 'i', ї: 'i', ј: 'j', ԁ: 'd', ӏ: 'l', һ: 'h', ԛ: 'q', ԝ: 'w',
  α: 'a', β: 'b', ε: 'e', η: 'n', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x', ϲ: 'c', ω: 'w',
};
/** The word as plain a–z, the way it reads: accents off, look-alike letters swapped for the Latin ones. */
export const skeleton = (w) =>
  w
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/./gu, (c) => LOOKALIKE[c] || c)
    .replace(/[^a-z]/g, '');
// a word that mixes Latin letters with Cyrillic or Greek ones is almost always a disguise
const mixed = (w) => /\p{Script=Latin}/u.test(w) && /[\p{Script=Cyrillic}\p{Script=Greek}]/u.test(w);
export const listFlags = (w) => mixed(w) || NOPE.some((n) => skeleton(w).includes(n));

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

/**
 * Is this the admin secret? Both sides are hashed first, so the comparison is
 * always of two equal-length digests and says nothing about the secret's length,
 * then compared in constant time.
 */
export async function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))));
  if (crypto.subtle.timingSafeEqual) return crypto.subtle.timingSafeEqual(x, y);
  const u = new Uint8Array(x);
  const v = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}

/** The request body as text, read no further than `max` bytes (null past that), chunked or not. */
export async function readCapped(request, max) {
  if (Number(request.headers.get('content-length') || 0) > max) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      reader.cancel().catch(() => {});
      return null;
    }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    all.set(p, at);
    at += p.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** The request says it's JSON: the media type itself, not just somewhere in the header. */
export const isJson = (request) => (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase() === 'application/json';

// Where the sheet may be stamped from: the live site only. (Previews share its
// database, so a preview can show the sheet but never add to it.)
const HOSTS = ['tgoyal.me', 'www.tgoyal.me'];
export const hostAllowed = (h) => typeof h === 'string' && HOSTS.includes(h);

/** The part of an address that's one person's: all of an IPv4 address, the first 64 bits of an IPv6 one. */
export function addressKey(ip) {
  if (!ip.includes(':')) return ip;
  const [head, tail = ''] = ip.toLowerCase().split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const full = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
  return full.slice(0, 4).map((g) => g.padStart(4, '0')).join(':') + '::/64';
}

/** One more of a word on the sheet (the tally keeps one row per word, for the admin page). */
export const addToTally = (env, word, at) =>
  env.DB.prepare('INSERT INTO tally (word, n, last) VALUES (?1, 1, ?2) ON CONFLICT(word) DO UPDATE SET n = n + 1, last = excluded.last')
    .bind(word, at)
    .run();

// The tables, made on first use (the same as db/gratitude.sql), so a fresh
// database needs no setup step. The tally is filled from the words once, if
// it's new; it backs the admin page's list of what's on the sheet.
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
  ])
    // where each stamp was pressed (added after the first tables; adding them again just fails, harmlessly)
    .then(() => Promise.allSettled(['x', 'y'].map((c) => env.DB.prepare(`ALTER TABLE words ADD COLUMN ${c} REAL`).run())))
    .catch((e) => {
      ready = null;
      throw e;
    }));
