// The gratitude sheet's moderation page (public/letters-admin.html).
// Words flagged by the check wait here. The secret stays in this tab only.
const key = () => sessionStorage.getItem('letters-key') || '';
const api = (opts = {}) => fetch('/api/gratitude/admin', { ...opts, headers: { authorization: 'Bearer ' + key(), 'content-type': 'application/json' } });
const msg = (t) => (document.getElementById('msg').textContent = t);
async function load() {
  const r = await api();
  if (!r.ok) return msg(r.status === 401 ? 'Wrong secret.' : 'Not set up yet.');
  const { pending, printed } = await r.json();
  const list = document.getElementById('list');
  list.textContent = '';
  msg(pending.length ? pending.length + ' waiting for a look.' : 'Nothing waiting.');
  document.getElementById('binall').hidden = !pending.length;
  const row = (text, buttons) => {
    const li = document.createElement('li');
    const w = document.createElement('span');
    w.textContent = text;
    li.append(w);
    for (const [label, cls, body] of buttons) {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = cls;
      b.onclick = async () => { await api({ method: 'POST', body: JSON.stringify(body) }); load(); };
      li.append(b);
    }
    return li;
  };
  for (const p of pending) list.append(row(p.word, [['Print it', 'ok', { id: p.id, action: 'approve' }], ['Bin it', 'no', { id: p.id, action: 'reject' }]]));
  const on = document.getElementById('printed');
  on.textContent = '';
  for (const p of printed) on.append(row(p.n > 1 ? p.word + ' ×' + p.n : p.word, [['Take it down', 'no', { action: 'remove', word: p.word }]]));
}
document.getElementById('auth').onsubmit = (e) => { e.preventDefault(); sessionStorage.setItem('letters-key', document.getElementById('key').value); load(); };
// a flood of junk in the queue goes in one go
document.getElementById('binall').onclick = async () => {
  if (!confirm('Bin every word waiting for a look?')) return;
  await api({ method: 'POST', body: JSON.stringify({ action: 'reject-all' }) });
  load();
};
if (key()) load();
