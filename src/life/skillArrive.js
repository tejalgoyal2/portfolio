import { prefs } from './prefs';
import { SKILL_ICONS } from '../data/skillIcons';

/**
 * The skills arrive as their own icons. The first time the type case comes
 * into view (once a visit — scroll back and it's simply there), the icons fly
 * in, one category at a time so the air is never crowded: one wave sweeps in
 * from the left, the next from the right, one from far behind (small,
 * growing), one past your shoulder (big, shrinking), each icon on its own
 * swinging curve. They come in fast and ease right down as they arrive — the
 * "left-leaning bell" of speed: most of the distance early, a long gentle
 * settle — and each one, landing on its slot, shrinks away as the slug grows
 * out of it with a small bounce.
 *
 * Click a skill afterwards and it turns into its icon for a moment and back.
 *
 * Brand marks in their own colours, generic ones hand-drawn in ink (see
 * src/data/skillIcons.js). Plain <img>s moved with transforms and opacity
 * only (the compositor does the work), about ten in the air at once, all
 * gone when it's done. Reduced motion (or no JS): the slugs are just there.
 */
const INK = '#1c140e';
const FROM = ['left', 'right', 'back', 'front', 'right', 'left', 'back'];
const EASE_IN_PLACE = 'cubic-bezier(0.16, 1, 0.3, 1)'; // quick away, long settle

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

/** Where a wave's icons start, relative to the slot they're heading for (section coordinates). */
function startFor(from, slot, W) {
  switch (from) {
    case 'left':
      return { x: -slot.x - rnd(80, 260), y: rnd(-220, 120), s: rnd(0.9, 1.4), r: rnd(-60, -20) };
    case 'right':
      return { x: W - slot.x + rnd(80, 260), y: rnd(-220, 120), s: rnd(0.9, 1.4), r: rnd(20, 60) };
    case 'back':
      // far off behind the page: small, high, faint
      return { x: rnd(-160, 160), y: rnd(-420, -260), s: rnd(0.15, 0.3), r: rnd(-30, 30) };
    default:
      // past your shoulder: huge, from below
      return { x: rnd(-300, 300), y: rnd(380, 560), s: rnd(2.4, 3.4), r: rnd(-40, 40) };
  }
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

  // ---- the arrival, once
  let io = null;
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
    timers.add(soon);
    io = new IntersectionObserver(
      async ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        await loadIcons();
        arrive();
      },
      { threshold: 0.18 }
    );
    io.observe(grid);
  }

  function arrive() {
    const layer = document.createElement('div');
    layer.className = 'skill-flyers';
    layer.setAttribute('aria-hidden', 'true');
    section.appendChild(layer);
    const sr = section.getBoundingClientRect();
    const W = section.clientWidth;
    let left = slugs.length;
    // whatever happens, nobody is left looking at an empty case
    later(() => {
      slugs.forEach((s) => s.classList.add('is-landed'));
      section.classList.remove('skills-await');
      layer.remove();
    }, 9000);
    const done = () => {
      if (--left > 0) return;
      layer.remove();
      section.classList.remove('skills-await');
    };

    cats.forEach((cat, c) => {
      const from = FROM[c % FROM.length];
      [...cat.querySelectorAll('.skill')].forEach((slug, i) => {
        const url = urls?.[slug.textContent.trim()];
        const r = slug.getBoundingClientRect();
        const slot = { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
        const delay = c * 340 + i * 55 + rnd(0, 60);
        const land = () => {
          slug.classList.add('is-landed');
          slug.animate(
            [
              { opacity: 0, transform: 'scale(0.35)' },
              { opacity: 1, transform: 'scale(1.06)', offset: 0.6 },
              { opacity: 1, transform: 'scale(1)' },
            ],
            { duration: 420, easing: 'ease-out' }
          );
          done();
        };
        if (!url) {
          later(land, delay + 900);
          return;
        }
        const img = document.createElement('img');
        img.className = 'skill-flyer';
        img.alt = '';
        img.src = url;
        img.style.left = `${slot.x - 18}px`;
        img.style.top = `${slot.y - 18}px`;
        layer.appendChild(img);
        const s0 = startFor(from, slot, W);
        // a swing: the path bows out to one side on the way in
        const bow = rnd(-1, 1) * 120;
        const mid = { x: s0.x * 0.35 + bow, y: s0.y * 0.35 - Math.abs(bow) * 0.4 };
        const dur = rnd(1050, 1350);
        const fly = img.animate(
          [
            { transform: `translate(${s0.x}px, ${s0.y}px) rotate(${s0.r}deg) scale(${s0.s})`, opacity: 0 },
            { transform: `translate(${s0.x * 0.8}px, ${s0.y * 0.8}px) rotate(${s0.r * 0.8}deg) scale(${s0.s * 0.9 + 0.1})`, opacity: 1, offset: 0.08 },
            { transform: `translate(${mid.x}px, ${mid.y}px) rotate(${s0.r * 0.3}deg) scale(${(s0.s + 1) / 2})`, opacity: 1, offset: 0.45 },
            { transform: 'translate(0px, 0px) rotate(0deg) scale(1)', opacity: 1 },
          ],
          { duration: dur, delay, easing: EASE_IN_PLACE, fill: 'both' }
        );
        fly.onfinish = () => {
          // landing: the icon shrinks into the slot as the slug grows out of it
          const out = img.animate(
            [
              { transform: 'scale(1)', opacity: 1 },
              { transform: 'scale(0.2)', opacity: 0 },
            ],
            { duration: 300, easing: 'ease-in', fill: 'forwards' }
          );
          out.onfinish = () => img.remove();
          land();
        };
      });
    });
  }

  // ---- afterwards: a click turns the skill into its icon for a moment
  const onClick = async (e) => {
    const slug = e.target.closest?.('.skill');
    if (!slug || slug.classList.contains('is-icon')) return;
    await loadIcons();
    const url = urls?.[slug.textContent.trim()];
    if (!url) return;
    let img = slug.querySelector(':scope > .skill-face');
    if (!img) {
      img = document.createElement('img');
      img.className = 'skill-face';
      img.alt = '';
      img.src = url;
      slug.appendChild(img);
    }
    slug.classList.add('is-icon');
    later(() => slug.classList.remove('is-icon'), 1200);
  };
  section.addEventListener('click', onClick);

  return () => {
    io?.disconnect();
    timers.forEach((t) => (t.disconnect ? t.disconnect() : clearTimeout(t)));
    section.removeEventListener('click', onClick);
    section.classList.remove('skills-await');
    section.querySelector('.skill-flyers')?.remove();
  };
}
