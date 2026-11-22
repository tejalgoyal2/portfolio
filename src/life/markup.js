import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { gsap } from 'gsap';
import { prefs } from './prefs';
import { onLayout } from './layout';
import { setHand } from './hand';

gsap.registerPlugin(ScrollTrigger);

/**
 * The editor goes over the copy in red pen. Phrases marked up in the markup
 * as <span data-mark="circle|underline|scribble" data-note="…"> get, once
 * their paragraph has inked in, a mark drawn round or under them in one
 * stroke of the pen — a loose loop, a wobbly underline, a quick box of
 * scribble — and a little handwritten note on a slip of paper, stuck just
 * above the phrase for a moment, then tucked away.
 *
 * Hover a marked phrase and the editor goes over it again (the mark redraws,
 * the note pops back up while you're on it). The marks sit in one SVG over the column, measured
 * from the words' own line boxes, so a phrase that wraps is marked on every
 * line it runs over; they're re-measured when the layout changes. Nothing
 * here moves the words. Reduced motion: the marks are simply there.
 */
const NS = 'http://www.w3.org/2000/svg';
const wob = (seed, k) => Math.sin(seed * 12.9898 + k * 78.233) * 0.5;

function loop(r, seed) {
  // once round and a bit, starting low on the left
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const rx = r.w / 2 + 9;
  const ry = r.h / 2 + 5;
  let d = '';
  const n = 30;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const a = Math.PI * 0.9 + t * Math.PI * 2.18;
    const g = 1 + t * 0.06 + wob(seed, k) * 0.05;
    const x = cx + Math.cos(a) * rx * g;
    const y = cy + Math.sin(a) * ry * g - t * 2;
    d += `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

function underline(r, seed) {
  // a wobbly stroke under the words, with a little flick at the end
  const y = r.y + r.h - 1;
  let d = `M${(r.x - 2).toFixed(1)} ${(y + 1).toFixed(1)}`;
  const n = Math.max(4, Math.round(r.w / 18));
  for (let k = 1; k <= n; k++) {
    const x = r.x - 2 + ((r.w + 6) * k) / n;
    d += `L${x.toFixed(1)} ${(y + Math.sin(k * 1.9 + seed) * 1.6).toFixed(1)}`;
  }
  return `${d}l7 -5`;
}

function scribble(r, seed) {
  // a quick box round the words, drawn in one go, corners overshooting
  const p = 5;
  const x0 = r.x - p;
  const y0 = r.y - p + 1;
  const x1 = r.x + r.w + p;
  const y1 = r.y + r.h + p - 1;
  const j = (k) => wob(seed, k) * 4;
  return `M${x0 + j(1)} ${y1 + 3}L${x0 + j(2)} ${y0 - 2}L${x1 + 4} ${y0 + j(3)}L${x1 + j(4)} ${y1 + 2}L${x0 - 6} ${y1 + j(5)}`;
}

const DRAW = { circle: loop, underline, scribble };

export function startMarkup(container) {
  if (!container) return () => {};
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'markup-layer');
  svg.setAttribute('aria-hidden', 'true');
  container.appendChild(svg);
  const notes = [];
  let marks = [];
  const triggers = [];
  let drawn = new Set();

  const build = () => {
    svg.innerHTML = '';
    notes.forEach((n) => n.remove());
    notes.length = 0;
    const cr = container.getBoundingClientRect();
    // a phrase split over lines (by the line inking) shows up as several spans: group them
    const groups = new Map();
    container.querySelectorAll('[data-mark]').forEach((el) => {
      const id = el.dataset.markId || el.textContent;
      if (!groups.has(id)) groups.set(id, { kind: el.dataset.mark, note: el.dataset.note, els: [] });
      groups.get(id).els.push(el);
    });
    marks = [...groups.entries()].map(([id, g], i) => {
      const rects = g.els.flatMap((el) => [...el.getClientRects()]).filter((r) => r.width > 2);
      const local = rects.map((r) => ({ x: r.left - cr.left, y: r.top - cr.top, w: r.width, h: r.height }));
      const paths = (g.kind === 'circle' ? local.slice(0, 1) : local).map((r, k) => {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', DRAW[g.kind]?.(r, i * 7 + k) || '');
        p.setAttribute('pathLength', '1');
        svg.appendChild(p);
        return p;
      });
      let note = null;
      if (g.note && local.length) {
        const last = local[local.length - 1];
        note = document.createElement('span');
        note.className = 'markup-note';
        setHand(note, g.note, { slope: [-6, 4] });
        note.style.left = `${(last.x + last.w - 6).toFixed(0)}px`;
        note.style.top = `${(last.y - 4).toFixed(0)}px`;
        container.appendChild(note);
        notes.push(note);
      }
      const done = drawn.has(id);
      paths.forEach((p) => (p.style.strokeDashoffset = done || prefs.reduced ? '0' : '1'));
      return { id, paths, note, els: g.els };
    });
    hookHovers();
  };

  const draw = (m, delay = 0, fast = false) => {
    drawn.add(m.id);
    if (prefs.reduced) return;
    gsap.fromTo(m.paths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: fast ? 0.45 : 0.75, ease: 'power2.inOut', delay, stagger: 0.12 });
    if (m.note && !fast) flash(m.note, delay + 0.55, 2.4);
  };
  const flash = (note, after, hold) => {
    clearTimeout(note._t);
    note._t = setTimeout(() => {
      note.classList.add('is-on');
      note._t = setTimeout(() => note.classList.remove('is-on'), hold * 1000);
    }, after * 1000);
  };

  // hovering a marked phrase: the editor goes over it again
  let unhook = [];
  function hookHovers() {
    unhook.forEach((f) => f());
    unhook = marks.flatMap((m) =>
      m.els.map((el) => {
        const again = () => {
          if (!drawn.has(m.id)) return;
          if (!prefs.reduced) draw(m, 0, true);
          if (m.note) {
            clearTimeout(m.note._t);
            m.note.classList.add('is-on');
          }
        };
        const away = () => {
          if (!m.note) return;
          clearTimeout(m.note._t);
          m.note._t = setTimeout(() => m.note.classList.remove('is-on'), 600);
        };
        el.addEventListener('pointerenter', again);
        el.addEventListener('pointerleave', away);
        return () => {
          el.removeEventListener('pointerenter', again);
          el.removeEventListener('pointerleave', away);
        };
      })
    );
  }

  build();
  // draw each paragraph's marks once it has inked in
  container.querySelectorAll('p').forEach((p) => {
    triggers.push(
      ScrollTrigger.create({
        trigger: p,
        start: 'top 52%',
        once: true,
        onEnter: () => {
          marks.filter((m) => p.contains(m.els[0])).forEach((m, k) => draw(m, 0.15 + k * 0.5));
        },
      })
    );
  });
  const offLayout = onLayout(() => requestAnimationFrame(build));
  const late = setTimeout(build, 900); // after the line inking has split its paragraphs

  return () => {
    clearTimeout(late);
    offLayout();
    triggers.forEach((t) => t.kill());
    unhook.forEach((f) => f());
    notes.forEach((n) => n.remove());
    svg.remove();
    drawn = new Set();
  };
}
