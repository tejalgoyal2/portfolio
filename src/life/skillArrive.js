import { prefs } from './prefs';
import { settings } from './settings';
import { RIPPLE_SPEED } from './iconDrift';
import { SKILL_ICONS } from '../data/skillIcons';

/**
 * The skills arrive as their own icons, assembling like type being set from
 * a scattered case. Each group waits until you've scrolled to it (once a
 * visit — scroll back and it's simply there); then its icons come in all at
 * once from every side — one from the left, the next from the right, one from
 * far behind on the left (small, growing), one from past your shoulder on the
 * right (big, shrinking), and so on round — each on its own easy curve,
 * converging on the group. They move the way Tejal likes: most of the
 * distance early, then a long, gentle settle. Each one drops into its cell
 * like a sort into the stick: the icon shrinks away as the cell sets in place
 * with a small give.
 *
 * The cells are hidden from the very first paint until their icon lands
 * (Skills.jsx sets that up before anything is drawn), so you never see them
 * first. A group already scrolled past when this starts is simply there.
 *
 * Afterwards a cell shows its icon when asked — point at it, tap it, or let a
 * click's ripple on the paper nearby pass through it: the word rolls up out
 * of the cell and the icon rolls up into it from below, like a counter
 * turning over (and back again).
 *
 * Light by design: plain <img>s moved with transforms and opacity only (the
 * compositor does the work), a handful of keyframes each, removed as they
 * land; the hover and the ripple only swap a class. Brand marks in their own
 * colours, generic ones hand-drawn in ink (see src/data/skillIcons.js).
 * Reduced motion (or no JS): the cells are just there.
 */
const INK = '#1c140e';
// where the icons come from, round and round: [dx, dy] off the cell in
// section px (a side off the screen), and how big they start (small = far behind)
const DIRS = [
  { k: 'left', s: 1 },
  { k: 'right', s: 1 },
  { k: 'behind-left', s: 0.2 },
  { k: 'front-right', s: 2.6 },
  { k: 'behind-right', s: 0.2 },
  { k: 'front-left', s: 2.6 },
];
const WAVE_GAP = 600; // ms at least between one group's arrival and the next
const NEAR_WAVE = 260; // px: cells this close to a ripple show their icons

let urls = null;
let loading = null;
function loadIcons() {
  loading ||= Promise.all([import('./brands'), import('./icons')]).then(([{ brandURL }, { ICON }]) => {
    urls = {};
    for (const [skill, m] of Object.entries(SKILL_ICONS)) {
      if (m.brand) urls[skill] = brandURL(m.brand);
      else if (ICON[m.icon]) {
        const svg = ICON[m.icon].replace(/stroke="currentColor"/g, `stroke="${INK}"`);
        urls[skill] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      }
    }
  });
  return loading;
}

const rnd = (a, b) => a + Math.random() * (b - a);
/** Most of the way early, then a long gentle settle (the "left-leaning bell" of speed). */
const settle = (t) => 1 - (1 - t) ** 2.6;

/** Where an icon starts, as an offset from its cell (section px). */
function startOf(dir, slot, W, top, vh) {
  const offL = -slot.x - rnd(60, 160);
  const offR = W - slot.x + rnd(60, 160);
  const up = top - slot.y - rnd(40, 120); // above the screen
  const down = top + vh - slot.y + rnd(40, 120); // below it
  switch (dir.k) {
    case 'left':
      return { x: offL, y: rnd(-160, 60) };
    case 'right':
      return { x: offR, y: rnd(-160, 60) };
    case 'behind-left':
      return { x: -slot.x * 0.5 - rnd(0, 120), y: up };
    case 'behind-right':
      return { x: (W - slot.x) * 0.5 + rnd(0, 120), y: up };
    case 'front-right':
      return { x: (W - slot.x) * 0.6 + rnd(0, 80), y: down };
    default:
      return { x: -slot.x * 0.6 - rnd(0, 80), y: down };
  }
}

/** A slug's icon, made once and kept inside it. */
function faceOf(slug) {
  let img = slug.querySelector(':scope > .skill-face');
  const url = urls?.[slug.textContent.trim()];
  if (!img && url) {
    img = document.createElement('img');
    img.className = 'skill-face';
    img.alt = '';
    img.src = url;
    slug.appendChild(img);
  }
  return img;
}

export function startSkillArrive(section) {
  if (!section) return () => {};
  const grid = section.querySelector('.skill-index');
  const cats = [...section.querySelectorAll('.skill-cat')];
  const slugs = [...section.querySelectorAll('.skill')];
  if (!grid || !slugs.length) return () => {};
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };
  const observers = [];

  let layer = null;
  let landedCount = 0;
  const landed = (slug) => {
    if (slug.classList.contains('is-landed')) return;
    slug.classList.add('is-landed');
    if (++landedCount >= slugs.length) {
      section.classList.remove('skills-await');
      layer?.remove();
      layer = null;
    }
  };

  // ---- the arrival: each group once, as you reach it
  if (!prefs.reduced) {
    section.classList.add('skills-await');
    // fetch the icons only as the case gets near, not with the page
    const soon = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        soon.disconnect();
        loadIcons();
      },
      { rootMargin: '900px 0px' }
    );
    soon.observe(grid);
    observers.push(soon);

    // a group comes in when its label is a good way up the screen, in order
    let nextAt = 0;
    let waiting = cats.length;
    const queue = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          queue.unobserve(e.target);
          const c = cats.indexOf(e.target);
          const now = performance.now();
          const at = Math.max(now, nextAt);
          nextAt = at + WAVE_GAP;
          later(async () => {
            await loadIcons();
            assemble(c);
            if (--waiting === 0) queue.disconnect();
          }, at - now);
        }
      },
      { rootMargin: '0px 0px -28% 0px' }
    );
    // a group already scrolled past (a reload halfway down the page) is simply there
    cats.forEach((cat) => {
      if (cat.getBoundingClientRect().bottom < 0) {
        waiting--;
        cat.querySelectorAll('.skill').forEach((sl) => landed(sl));
      } else queue.observe(cat);
    });
    observers.push(queue);
  }

  function assemble(c) {
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'skill-flyers';
      layer.setAttribute('aria-hidden', 'true');
      section.appendChild(layer);
    }
    const sr = section.getBoundingClientRect();
    const W = section.clientWidth;
    const top = -sr.top;
    const vh = window.innerHeight;
    const mine = [...cats[c].querySelectorAll('.skill')];
    // whatever happens (an icon that never loads), this group isn't left empty
    later(() => mine.forEach((sl) => landed(sl)), mine.length * 60 + 3500);
    mine.forEach((slug, i) => {
      if (slug.classList.contains('is-landed')) return;
      const url = urls?.[slug.textContent.trim()];
      const r = slug.getBoundingClientRect();
      const slot = { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
      const delay = i * 60 + rnd(0, 80);
      const dur = rnd(1300, 1600);
      if (!url) {
        later(() => setIn(slug), delay + dur * 0.8);
        return;
      }
      const dir = DIRS[(i + c * 2) % DIRS.length];
      const a = startOf(dir, slot, W, top, vh);
      // one easy curve in: a bend out to the side, then down onto the cell
      const bend = { x: a.x * 0.35 + rnd(-60, 60), y: a.y * 0.2 - rnd(30, 90) };
      const N = 8;
      const frames = [];
      for (let k = 0; k <= N; k++) {
        const t = k / N;
        const u = settle(t);
        const v = 1 - u;
        const x = v * v * a.x + 2 * v * u * bend.x;
        const y = v * v * a.y + 2 * v * u * bend.y;
        const sc = dir.s + (1 - dir.s) * u;
        frames.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${sc.toFixed(3)})`, opacity: k === 0 ? 0 : 1, offset: t });
      }
      const img = document.createElement('img');
      img.className = 'skill-flyer';
      img.alt = '';
      img.src = url;
      img.style.left = `${slot.x - 18}px`;
      img.style.top = `${slot.y - 18}px`;
      layer.appendChild(img);
      const fly = img.animate(frames, { duration: dur, delay, easing: 'linear', fill: 'both' });
      fly.onfinish = () => {
        // into the cell: the icon shrinks away as the cell sets in place
        const out = img.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.4)', opacity: 0 }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
        out.onfinish = () => img.remove();
        setIn(slug);
      };
    });
  }

  /** A cell sets in place: in from a touch small, with a little give. */
  function setIn(slug) {
    landed(slug);
    slug.animate(
      [
        { transform: 'scale(0.86)', opacity: 0 },
        { transform: 'scale(1.04)', opacity: 1, offset: 0.55 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 420, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' }
    );
  }

  // ---- afterwards: the slugs show their icons
  const show = async (slug, ms = 0) => {
    await loadIcons();
    if (!faceOf(slug)) return;
    slug.classList.add('is-icon');
    if (ms) {
      clearTimeout(slug._iconT);
      slug._iconT = setTimeout(() => {
        if (!slug.matches(':hover')) slug.classList.remove('is-icon');
      }, ms);
    }
  };
  const hide = (slug) => {
    clearTimeout(slug._iconT);
    slug.classList.remove('is-icon');
  };

  // pointing at one turns it into its icon until you leave
  const onOver = (e) => {
    if (e.pointerType === 'touch') return;
    const slug = e.target.closest?.('.skill');
    if (slug && !slug.contains(e.relatedTarget)) show(slug);
  };
  const onOut = (e) => {
    if (e.pointerType === 'touch') return;
    const slug = e.target.closest?.('.skill');
    if (slug && !slug.contains(e.relatedTarget)) hide(slug);
  };
  // a tap (touch) turns it for a moment
  const onClick = (e) => {
    const slug = e.target.closest?.('.skill');
    if (!slug) return;
    show(slug, 1300);
  };
  // a ripple from a click on the paper nearby: each slug it reaches flashes its icon as the wave passes
  const onPress = (e) => {
    if (prefs.reduced || !settings.ripples) return;
    const { x, y } = e.detail;
    const box = section.getBoundingClientRect();
    if (y < box.top - NEAR_WAVE || y > box.bottom + NEAR_WAVE) return;
    for (const slug of slugs) {
      const r = slug.getBoundingClientRect();
      const dx = Math.max(r.left - x, 0, x - r.right);
      const dy = Math.max(r.top - y, 0, y - r.bottom);
      const d = Math.hypot(dx, dy);
      if (d > NEAR_WAVE) continue;
      const wait = (d / RIPPLE_SPEED) * 1000;
      const t = setTimeout(() => {
        timers.delete(t);
        show(slug, 950);
      }, wait);
      timers.add(t);
    }
  };
  section.addEventListener('pointerover', onOver);
  section.addEventListener('pointerout', onOut);
  section.addEventListener('click', onClick);
  window.addEventListener('life:press', onPress);

  return () => {
    observers.forEach((o) => o.disconnect());
    timers.forEach(clearTimeout);
    slugs.forEach((s) => clearTimeout(s._iconT));
    section.removeEventListener('pointerover', onOver);
    section.removeEventListener('pointerout', onOut);
    section.removeEventListener('click', onClick);
    window.removeEventListener('life:press', onPress);
    section.classList.remove('skills-await');
    layer?.remove();
  };
}
