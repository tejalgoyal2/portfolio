// /api/gratitude — the stamps on the gratitude sheet (GET) and a new one (POST).
//
// Bindings (Pages → Settings → Bindings / Variables and secrets):
//   DB                D1 database "gratitude" (schema: db/gratitude.sql; made on first use)
//   AI                Workers AI (Llama Guard checks each word)
//   TURNSTILE_SECRET  secret — the Turnstile widget's secret key
//   SALT              secret — any long random string (hashes the daily limit)
//   ADMIN_SECRET      secret — for /letters-admin (at least 24 characters)
// Optional:
//   DAILY_CAP         how many new words the whole site takes a day (default 300)
//   TURNSTILE_ANY_HOST '1' only for local testing with Turnstile's test keys
//
// What keeps it cheap and tidy, in order, before anything is written:
// the body is small JSON; the word is one or two words of letters, ≤ 24
// characters; Turnstile says it's a person, on this site, for this form; the
// site hasn't taken its DAILY_CAP today and the review queue isn't full; and
// this address (hashed with a salt and the day, never stored) hasn't left its
// PER_DAY yet today. Only then is Workers AI asked, once.
import { json, clean, listFlags, aiCheck, sha256, ensure, addToTally, hostAllowed, addressKey, readCapped, isJson } from '../../../lib/gratitude.js';

const SHOWN = 80;
const PENDING_MAX = 500;
const PER_DAY = 3; // stamps a day from each address

export async function onRequestGet({ request, env, waitUntil }) {
  const open = !!(env.DB && env.TURNSTILE_SECRET && env.SALT);
  if (!env.DB) return json({ words: [], open: false }, 200);
  // the same answer for everyone for half a minute, from the edge cache where there is one
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(new URL('/api/gratitude', request.url).toString(), { method: 'GET' });
  const hit = await cache?.match(key).catch(() => null);
  if (hit) return hit;
  await ensure(env);
  // the newest stamps and where each was pressed (the status index keeps this to ~80 rows read)
  const { results } = await env.DB.prepare(
    "SELECT word, x, y FROM words WHERE status = 'approved' ORDER BY created_at DESC LIMIT ?1"
  )
    .bind(SHOWN)
    .all();
  const stamps = results.reverse().map((r) => ({ word: r.word, x: r.x ?? null, y: r.y ?? null }));
  const res = json({ stamps, open }, 200, {
    'cache-control': 'public, max-age=30',
  });
  if (cache) waitUntil(cache.put(key, res.clone()).catch(() => {}));
  return res;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.TURNSTILE_SECRET || !env.SALT) return json({ error: 'closed' }, 503);
  // JSON and nothing else (a "simple" cross-site content type never gets this far), and small
  if (!isJson(request)) return json({ error: 'bad request' }, 415);
  const raw = await readCapped(request, 4096);
  if (raw === null) return json({ error: 'too long' }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  const word = clean(body?.word);
  if (!word) return json({ error: 'one or two words, letters only' }, 422);
  // where on the sheet it was pressed: a fraction of the width and height, kept off the edges
  const place = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(hi, Math.max(lo, v)) * 1000) / 1000 : null);
  const x = place(body?.x, 0.06, 0.94);
  const y = place(body?.y, 0.1, 0.9);
  const token = typeof body?.token === 'string' ? body.token : '';
  if (!token || token.length > 2048) return json({ error: 'check failed' }, 403);

  // a person, not a script — on this site, for this form
  const ip = request.headers.get('CF-Connecting-IP') || '';
  let outcome = {};
  try {
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(10000),
    });
    outcome = await verify.json();
  } catch {
    return json({ error: 'check failed' }, 403);
  }
  const anyHost = env.TURNSTILE_ANY_HOST === '1';
  if (!outcome.success || (!anyHost && (outcome.action !== 'gratitude' || !hostAllowed(outcome.hostname)))) {
    return json({ error: 'check failed' }, 403);
  }

  await ensure(env);
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare('DELETE FROM daily WHERE day < ?1').bind(day).run();

  // the whole site takes so many a day, and stops taking more while the review queue is full
  const cap = Math.max(1, Number(env.DAILY_CAP) || 300);
  const today = await env.DB.prepare('SELECT COALESCE(SUM(n), 0) AS n FROM daily WHERE day = ?1').bind(day).first();
  if ((today?.n || 0) >= cap) return json({ error: 'full today' }, 429);
  const queued = await env.DB.prepare("SELECT COUNT(*) AS n FROM words WHERE status = 'pending'").first();
  if ((queued?.n || 0) >= PENDING_MAX) return json({ error: 'full today' }, 429);

  // a few a day: a salted hash of the day and the address (IPv6 by its /64, the part a person
  // holds), and how many it's left; the count only goes up while it's under the limit
  const hash = await sha256(`${env.SALT}|${day}|${addressKey(ip)}`);
  const put = await env.DB.prepare(
    'INSERT INTO daily (hash, day, n) VALUES (?1, ?2, 1) ON CONFLICT(hash) DO UPDATE SET n = n + 1 WHERE n < ?3 RETURNING n'
  )
    .bind(hash, day, PER_DAY)
    .first();
  if (!put) return json({ error: 'enough today' }, 429);

  // checked before it's printed: anything doubtful waits for a person
  const ai = listFlags(word) ? 'unsafe' : await aiCheck(env, word);
  const ok = ai === 'safe' || (ai === 'unknown' && env.ALLOW_WITHOUT_AI === '1');
  const now = Date.now();
  await env.DB.prepare('INSERT INTO words (word, status, created_at, x, y) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(word, ok ? 'approved' : 'pending', now, x, y)
    .run();
  if (ok) await addToTally(env, word, now);
  return json({ received: true, printed: ok, word, left: PER_DAY - put.n });
}
