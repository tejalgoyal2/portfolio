// /api/gratitude/admin — the words waiting for a look, and approving or
// rejecting one; the words on the sheet, and taking one down. Needs
// `Authorization: Bearer <ADMIN_SECRET>` (the page at /letters-admin asks for
// it; the secret must be at least 24 characters). Put the route behind
// Cloudflare Access too if you like; this check stays either way.
import { json, same, ensure, addToTally } from '../../../lib/gratitude.js';

const allowed = async (request, env) => {
  const auth = request.headers.get('authorization') || '';
  return !!env.ADMIN_SECRET && env.ADMIN_SECRET.length >= 24 && (await same(auth.replace(/^Bearer\s+/i, ''), env.ADMIN_SECRET));
};
// a wrong guess costs a moment, so guessing is slow as well as hopeless
const no = () => new Promise((r) => setTimeout(() => r(json({ error: 'no' }, 401)), 600));

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'closed' }, 503);
  if (!(await allowed(request, env))) return no();
  await ensure(env);
  const { results: pending } = await env.DB.prepare(
    `SELECT id, word, created_at FROM words WHERE status = 'pending' ORDER BY created_at DESC LIMIT 200`
  ).all();
  const { results: printed } = await env.DB.prepare('SELECT word, n FROM tally ORDER BY last DESC LIMIT 200').all();
  return json({ pending, printed });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'closed' }, 503);
  if (!(await allowed(request, env))) return no();
  await ensure(env);
  const body = await request.json().catch(() => ({}));
  // a flood of junk waiting for a look: bin the lot
  if (body?.action === 'reject-all') {
    await env.DB.prepare("UPDATE words SET status = 'rejected' WHERE status = 'pending'").run();
    return json({ ok: true });
  }
  // take a printed word down: every stamp of it, off the sheet
  if (body?.action === 'remove' && typeof body.word === 'string') {
    await env.DB.batch([
      env.DB.prepare("UPDATE words SET status = 'rejected' WHERE word = ?1 AND status = 'approved'").bind(body.word),
      env.DB.prepare('DELETE FROM tally WHERE word = ?1').bind(body.word),
    ]);
    return json({ ok: true });
  }
  const id = Number(body?.id);
  const status = body?.action === 'approve' ? 'approved' : body?.action === 'reject' ? 'rejected' : null;
  if (!Number.isInteger(id) || !status) return json({ error: 'bad request' }, 400);
  const row = await env.DB.prepare("SELECT word FROM words WHERE id = ?1 AND status = 'pending'").bind(id).first();
  if (!row) return json({ ok: true });
  await env.DB.prepare("UPDATE words SET status = ?1 WHERE id = ?2 AND status = 'pending'").bind(status, id).run();
  if (status === 'approved') await addToTally(env, row.word, Date.now());
  return json({ ok: true });
}
