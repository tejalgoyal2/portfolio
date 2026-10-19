import { prefs } from './prefs';
import { settings } from './settings';
import { RIPPLE_SPEED } from './iconDrift';
import { SKILL_ICONS } from '../data/skillIcons';

/**
 * The skills arrive as their own icons. Each category waits until you've
 * scrolled to it (once a visit — scroll back and it's simply there), then its
 * icons fly in as one wave — one from the left, the next from the right, one
 * from far behind (small, growing), one past your shoulder (big, shrinking) —
 * each on its own swinging, spinning curve. They come in fast and ease right
 * down as they arrive — the "left-leaning bell" of speed: most of the
 * distance early, a long gentle settle — and each one, landing on its slot,
 * squashes like a drop of ink and melts into the slug: the slug's paper opens
 * out from an icon-sized pill to its full width as the word inks in, with a
 * little burst of comic pop lines round it.
 *
 * Afterwards the slugs show their icons when asked: point at one and it turns
 * into its icon (and back when you leave); tap one on a touch screen and it
 * does for a moment; and a click on the bare paper near them sends its ripple
 * through, each slug the wave touches flashing its icon as the wave passes.
 *
 * Brand marks in their own colours, generic ones hand-drawn in ink (see
 * src/data/skillIcons.js). Plain <img>s moved with transforms and opacity
 * (the compositor does the work), one wave in the air at a time, all gone
 * when it's done; the hover and the ripple only swap a class. Reduced motion
 * (or no JS): the slugs are just there.
 */
const INK = '#1c140e';
const FROM = ['left', 'right', 'back', 'front', 'right', 'left', 'back'];
const EASE_IN_PLACE = 'cubic-bezier(0.13, 1, 0.24, 1)'; // quick away, long settle
const WAVE_GAP = 420; // ms at least between one category's wave and the next
const NEAR_WAVE = 260; // px: slugs this close to a ripple flash their icons

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
      return { x: -slot.x - rnd(90, 300), y: rnd(-260, 140), s: rnd(0.9, 1.5), r: rnd(-140, -50) };
    case 'right':
      return { x: W - slot.x + rnd(90, 300), y: rnd(-260, 140), s: rnd(0.9, 1.5), r: rnd(50, 140) };
    case 'back':
      // far off behind the page: small, high, faint
      return { x: rnd(-200, 200), y: rnd(-480, -300), s: rnd(0.12, 0.28), r: rnd(-90, 90) };
    default:
      // past your shoulder: huge, from below
      return { x: rnd(-340, 340), y: rnd(420, 620), s: rnd(2.6, 3.6), r: rnd(-70, 70) };
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

  // ---- the arrival: each category once, as you reach it
  let layer = null;
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

    // a category's wave goes when its label is a good way up the screen, in
    // order, never two at once
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
            wave(c);
            if (--waiting === 0) queue.disconnect();
          }, at - now);
        }
      },
      { rootMargin: '0px 0px -28% 0px' }
    );
    cats.forEach((cat) => queue.observe(cat));
    observers.push(queue);
    // whatever happens, nobody is left looking at an empty case
    later(() => {
      slugs.forEach((s) => s.classList.add('is-landed'));
      section.classList.remove('skills-await');
    }, 45000);
  }

  let landedCount = 0;
  const landed = (slug) => {
    slug.classList.add('is-landed');
    if (++landedCount >= slugs.length) {
      section.classList.remove('skills-await');
      layer?.remove();
      layer = null;
    }
  };

  function wave(c) {
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'skill-flyers';
      layer.setAttribute('aria-hidden', 'true');
      section.appendChild(layer);
    }
    const sr = section.getBoundingClientRect();
    const W = section.clientWidth;
    const from = FROM[c % FROM.length];
    [...cats[c].querySelectorAll('.skill')].forEach((slug, i) => {
      const url = urls?.[slug.textContent.trim()];
      const r = slug.getBoundingClientRect();
      const slot = { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, w: r.width, h: r.height };
      const delay = i * 85 + rnd(0, 90);
      if (!url) {
        later(() => melt(slug, slot), delay + 1200);
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
      // a swing: the path bows out to one side and back on the way in
      const bow = rnd(-1, 1) * 150;
      const p1 = { x: s0.x * 0.55 + bow * 0.6, y: s0.y * 0.55 - Math.abs(bow) * 0.35 };
      const p2 = { x: s0.x * 0.18 + bow * 0.45, y: s0.y * 0.18 - Math.abs(bow) * 0.2 };
      const p3 = { x: -bow * 0.06, y: -6 };
      const t = (p, rot, sc) => `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
      const dur = rnd(1800, 2300);
      const fly = img.animate(
        [
          { transform: t(s0, s0.r, s0.s), opacity: 0 },
          { transform: t({ x: s0.x * 0.82, y: s0.y * 0.82 }, s0.r * 0.85, s0.s * 0.9 + 0.1), opacity: 1, offset: 0.06 },
          { transform: t(p1, s0.r * 0.5, (s0.s + 1) / 2), opacity: 1, offset: 0.3 },
          { transform: t(p2, s0.r * 0.18, (s0.s + 3) / 4), opacity: 1, offset: 0.62 },
          { transform: t(p3, s0.r * -0.04, 1.04), opacity: 1, offset: 0.86 },
          { transform: t({ x: 0, y: 0 }, 0, 1), opacity: 1 },
        ],
        { duration: dur, delay, easing: EASE_IN_PLACE, fill: 'both' }
      );
      fly.onfinish = () => {
        // landing: it squashes like a drop of ink, and melts into the slug
        const out = img.animate(
          [
            { transform: 'scale(1)', opacity: 1 },
            { transform: 'scale(1.25, 0.72)', opacity: 1, offset: 0.25 },
            { transform: 'scale(0.82, 1.05)', opacity: 0.85, offset: 0.55 },
            { transform: 'scale(0.6)', opacity: 0 },
          ],
          { duration: 460, easing: 'ease-out', fill: 'forwards' }
        );
        out.onfinish = () => img.remove();
        melt(slug, slot);
      };
    });
  }

  /** The slug grows out of the icon: an icon-sized pill opening out to its full width as the word inks in. */
  function melt(slug, slot) {
    landed(slug);
    const pill = Math.max(0, slot.w / 2 - slot.h / 2);
    slug.animate(
      [
        { clipPath: `inset(0 ${pill.toFixed(1)}px round ${slot.h}px)`, color: 'rgba(28,20,14,0)', transform: 'scale(0.8)' },
        { clipPath: `inset(0 ${(pill * 0.35).toFixed(1)}px round ${slot.h}px)`, color: 'rgba(28,20,14,0)', transform: 'scale(1.05, 0.95)', offset: 0.35 },
        { clipPath: 'inset(0 0px round 3px)', color: 'rgba(28,20,14,0.7)', transform: 'scale(0.98, 1.02)', offset: 0.7 },
        { clipPath: 'inset(0 0px round 3px)', color: 'rgba(28,20,14,1)', transform: 'scale(1)' },
      ],
      { duration: 620, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' }
    );
    pop(slot);
  }

  /** A burst of comic pop lines round a slug that just landed. */
  function pop(slot) {
    if (!layer) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'skill-pop');
    const w = slot.w + 30;
    const h = slot.h + 26;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.style.cssText = `left:${(slot.x - w / 2).toFixed(1)}px;top:${(slot.y - h / 2).toFixed(1)}px;width:${w}px;height:${h}px`;
    // a short stroke off each corner and one off each end
    const e = 9;
    const L = 7;
    const d = [
      `M${e} ${e}l-${L} -${L * 0.8}`,
      `M${w - e} ${e}l${L} -${L * 0.8}`,
      `M${e} ${h - e}l-${L} ${L * 0.8}`,
      `M${w - e} ${h - e}l${L} ${L * 0.8}`,
      `M4 ${h / 2}h-${L}`,
      `M${w - 4} ${h / 2}h${L}`,
    ].join('');
    svg.innerHTML = `<path d="${d}"/>`;
    layer.appendChild(svg);
    const a = svg.animate(
      [
        { transform: 'scale(0.82)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1, offset: 0.3 },
        { transform: 'scale(1.18)', opacity: 0 },
      ],
      { duration: 420, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' }
    );
    a.onfinish = () => svg.remove();
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
