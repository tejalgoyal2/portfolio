// Shared by the gratitude corner's functions (functions/api/gratitude), kept
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

// The tables, made on first use (the same as db/gratitude.sql), so a fresh
// database needs no setup step.
let ready = null;
export const ensure = (env) =>
  (ready ||= env.DB.batch([
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS words (id INTEGER PRIMARY KEY AUTOINCREMENT, word TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL)"
    ),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS words_by_status ON words (status, created_at)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS daily (hash TEXT PRIMARY KEY, day TEXT NOT NULL)'),
  ]).catch((e) => {
    ready = null;
    throw e;
  }));
