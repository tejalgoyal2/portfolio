// /api/gratitude/admin — the words waiting for a look, and approving or
// rejecting one. Needs `Authorization: Bearer <ADMIN_SECRET>` (the page at
// /letters-admin.html asks for it). Put the route behind Cloudflare Access too
// if you like; this check stays either way.
import { json, same, ensure } from '../../../lib/gratitude.js';

const allowed = (request, env) => {
  const auth = request.headers.get('authorization') || '';
  return !!env.ADMIN_SECRET && same(auth.replace(/^Bearer\s+/i, ''), env.ADMIN_SECRET);
};

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'closed' }, 503);
  if (!allowed(request, env)) return json({ error: 'no' }, 401);
  await ensure(env);
  const { results } = await env.DB.prepare(
    `SELECT id, word, created_at FROM words WHERE status = 'pending' ORDER BY created_at DESC LIMIT 200`
  ).all();
  return json({ pending: results });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'closed' }, 503);
  if (!allowed(request, env)) return json({ error: 'no' }, 401);
  await ensure(env);
  const body = await request.json().catch(() => ({}));
  const id = Number(body?.id);
  const status = body?.action === 'approve' ? 'approved' : body?.action === 'reject' ? 'rejected' : null;
  if (!Number.isInteger(id) || !status) return json({ error: 'bad request' }, 400);
  await env.DB.prepare("UPDATE words SET status = ?1 WHERE id = ?2 AND status = 'pending'").bind(status, id).run();
  return json({ ok: true });
}
