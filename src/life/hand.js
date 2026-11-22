/**
 * A natural hand for the pen notes. Nobody writes a line tipped at exactly
 * the same angle every time: each note gets its own gentle slope (a touch up
 * or down, never the same twice), and inside it every word sits a little
 * differently — a hair higher or lower than the last, leaning a degree this
 * way or that, a shade bigger or smaller. Seeded from the words themselves,
 * so a note is always written the same way and nothing shifts between renders.
 *
 *   hand(text)            → { tilt, words: [{ w, r, y, s } | { space }] }
 *   handHTML(text, opts)  → the words as HTML (opts.letters wraps each letter too)
 *   setHand(el, text)     → writes the note into el and sets its --tilt
 *
 * CSS: .hw-w is an inline-block word (rotate var(--r), translate var(--y),
 * scale var(--s)); a note sets `rotate: var(--tilt)`.
 */
function seedOf(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** mulberry32: small, fast, good enough for a hand */
function random(seed) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hand(text, { slope = [-2.6, 1.6] } = {}) {
  const r = random(seedOf(String(text)));
  const tilt = slope[0] + r() * (slope[1] - slope[0]);
  let drift = 0;
  const words = String(text)
    .split(/(\s+)/)
    .filter(Boolean)
    .map((w) => {
      if (/^\s+$/.test(w)) return { space: w };
      // the baseline wanders a little as the hand moves along, and each word lands on it its own way
      drift = drift * 0.6 + (r() - 0.5) * 1.6;
      return {
        w,
        r: ((r() - 0.5) * 3.4).toFixed(2),
        y: (drift + (r() - 0.5) * 1.1).toFixed(2),
        s: (0.965 + r() * 0.075).toFixed(3),
      };
    });
  return { tilt: tilt.toFixed(2), words };
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function handHTML(text, { letters = false, ...opts } = {}) {
  let i = 0;
  return hand(text, opts)
    .words.map((p) => {
      if (p.space) {
        const sp = letters ? `<span class="hw-l" style="--i:${i}">&nbsp;</span>` : ' ';
        i++;
        return sp;
      }
      const inner = letters ? [...p.w].map((ch) => `<span class="hw-l" style="--i:${i++}">${esc(ch)}</span>`).join('') : esc(p.w);
      return `<span class="hw-w" style="--r:${p.r}deg;--y:${p.y}px;--s:${p.s}">${inner}</span>`;
    })
    .join('');
}

export function setHand(el, text, opts) {
  if (!el) return;
  el.style.setProperty('--tilt', `${hand(text, opts).tilt}deg`);
  el.innerHTML = handHTML(text, opts);
}
