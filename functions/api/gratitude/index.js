// /api/gratitude — the words on the corner (GET) and a new one (POST).
//
// Bindings (Pages → Settings → Functions):
//   DB                D1 database "gratitude" (schema: db/gratitude.sql)
//   AI                Workers AI (Llama Guard checks each word)
//   TURNSTILE_SECRET  secret — the Turnstile widget's secret key
//   SALT              secret — any long random string (hashes the daily limit)
//   ADMIN_SECRET      secret — for /letters-admin.html
import { json, clean, listFlags, aiCheck, sha256, ensure } from '../../../lib/gratitude.js';

const SHOWN = 60;

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ words: [], open: false }, 200);
  await ensure(env);
  const { results } = await env.DB.prepare(
    `SELECT word, COUNT(*) AS n, MAX(created_at) AS last FROM words
     WHERE status = 'approved' GROUP BY word ORDER BY last DESC LIMIT ?1`
  )
    .bind(SHOWN)
    .all();
  return json({ words: results.map((r) => ({ word: r.word, n: r.n })), open: true }, 200, {
    'cache-control': 'public, max-age=30',
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.TURNSTILE_SECRET || !env.SALT) return json({ error: 'closed' }, 503);
  if (!(request.headers.get('content-type') || '').includes('application/json')) return json({ error: 'bad request' }, 415);
  const raw = await request.text();
  if (raw.length > 4096) return json({ error: 'too long' }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  await ensure(env);
  const word = clean(body?.word);
  if (!word) return json({ error: 'one or two words, letters only' }, 422);

  // a person, not a script
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', String(body?.token || ''));
  if (ip) form.append('remoteip', ip);
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const outcome = await verify.json().catch(() => ({}));
  if (!outcome.success) return json({ error: 'check failed' }, 403);

  // once a day: a salted hash of the day and the address (the address is never kept)
  const day = new Date().toISOString().slice(0, 10);
  const hash = await sha256(`${env.SALT}|${day}|${ip}`);
  await env.DB.prepare('DELETE FROM daily WHERE day < ?1').bind(day).run();
  const put = await env.DB.prepare('INSERT OR IGNORE INTO daily (hash, day) VALUES (?1, ?2)').bind(hash, day).run();
  if (!put.meta?.changes) return json({ error: 'once a day' }, 429);

  // checked before it's printed: anything doubtful waits for a person
  const ai = listFlags(word) ? 'unsafe' : await aiCheck(env, word);
  const ok = ai === 'safe' || (ai === 'unknown' && env.ALLOW_WITHOUT_AI === '1');
  await env.DB.prepare('INSERT INTO words (word, status, created_at) VALUES (?1, ?2, ?3)')
    .bind(word, ok ? 'approved' : 'pending', Date.now())
    .run();
  return json({ received: true, printed: ok, word });
}
