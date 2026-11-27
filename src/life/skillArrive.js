import { prefs } from './prefs';
import { settings } from './settings';
import { RIPPLE_SPEED } from './iconDrift';
import { SKILL_ICONS } from '../data/skillIcons';

/**
 * The skills arrive as their own icons. Each category waits until you've
 * scrolled to it (once a visit — scroll back and it's simply there), then its
 * icons pour in as one stream: in from off the screen (the left, the right,
 * far behind the page, or past your shoulder), all along the same sweeping
 * curve like a flock, one behind another, banking through the turn, with a
 * faint trail of ghosts behind each — and drop out of the stream one by one
 * into their places. They move the way Tejal likes: most of the distance
 * early, then a long, gentle settle. Each one, landing, squashes like a drop
 * of ink and the slug opens out of it — paper growing from an icon-sized pill
 * to its full width while the word inks in, a little burst of pop lines
 * round it.
 *
 * The slugs are hidden from the very first paint until their icon lands
 * (Skills.jsx sets that up before anything is drawn), so you never see the
 * cells first. A category you've already scrolled past when this starts is
 * simply there.
 *
 * Afterwards the slugs show their icons when asked: point at one and it turns
 * into its icon (and back when you leave); tap one on a touch screen and it
 * does for a moment; and a click on the bare paper near them sends its ripple
 * through, each slug the wave touches flashing its icon as the wave passes.
 *
 * Brand marks in their own colours, generic ones hand-drawn in ink (see
 * src/data/skillIcons.js). Plain <img>s moved with transforms and opacity
 * (the compositor does the work), one stream in the air at a time, all gone
 * when it's done; the hover and the ripple only swap a class. Reduced motion
 * (or no JS): the slugs are just there.
 */
const INK = '#1c140e';
const FROM = ['left', 'right', 'back', 'front', 'right', 'left', 'back'];
const WAVE_GAP = 650; // ms at least between one category's wave and the next
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

const bez = (a, b, c, d, t) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};
/** Most of the way early, then a long gentle settle (the "left-leaning bell" of speed). */
const settle = (t) => 1 - (1 - t) ** 2.5;

/**
 * The stream's route for a category, in section px: where it comes in from
 * (off the screen) and the point it sweeps past before turning down into the
 * category. `s` is how big the icons are out there (small = far behind).
 */
function route(from, box, W, top, vh) {
  const midX = box.x + box.w / 2;
  switch (from) {
    case 'left':
      return { e: { x: -90, y: box.y - 220, s: 1.2 }, p: { x: box.x + box.w * 0.9, y: box.y - 150 } };
    case 'right':
      return { e: { x: W + 90, y: box.y - 220, s: 1.2 }, p: { x: box.x + box.w * 0.1, y: box.y - 150 } };
    case 'back':
      // from far off behind the page: tiny, high up, growing as it comes
      return { e: { x: midX + 160, y: top - 60, s: 0.15 }, p: { x: midX - box.w * 0.45, y: box.y - 120 } };
    default:
      // past your shoulder: huge from below the screen, shrinking into place
      return { e: { x: midX - 140, y: top + vh + 90, s: 2.8 }, p: { x: midX + box.w * 0.45, y: box.y - 70 } };
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
    // a category already scrolled past (a reload halfway down the page) is simply there
    cats.forEach((cat) => {
      if (cat.getBoundingClientRect().bottom < 0) {
        waiting--;
        cat.querySelectorAll('.skill').forEach((sl) => landed(sl));
      } else queue.observe(cat);
    });
    observers.push(queue);
  }


  function wave(c) {
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'skill-flyers';
      layer.setAttribute('aria-hidden', 'true');
      section.appendChild(layer);
    }
    const sr = section.getBoundingClientRect();
    const W = section.clientWidth;
    const cr = cats[c].getBoundingClientRect();
    const box = { x: cr.left - sr.left, y: cr.top - sr.top, w: cr.width, h: cr.height };
    const { e, p } = route(FROM[c % FROM.length], box, W, -sr.top, window.innerHeight);
    const N = 18; // points along the curve, sampled with the settle already applied
    // whatever happens (an icon that never loads), this category isn't left empty
    const mine = [...cats[c].querySelectorAll('.skill')];
    later(() => mine.forEach((sl) => landed(sl)), mine.length * 95 + 4000);
    [...cats[c].querySelectorAll('.skill')].forEach((slug, i) => {
      if (slug.classList.contains('is-landed')) return;
      const url = urls?.[slug.textContent.trim()];
      const r = slug.getBoundingClientRect();
      const slot = { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, w: r.width, h: r.height };
      // one behind another along the stream
      const delay = i * 95;
      const dur = 1650 + Math.min(i, 10) * 25;
      if (!url) {
        later(() => melt(slug, slot), delay + dur * 0.85);
        return;
      }
      // the shared curve, a touch of spread so the flock isn't a single file
      const j = (rnd(-1, 1) * 24);
      const ax = e.x + j;
      const ay = e.y + rnd(-1, 1) * 30;
      const bx = p.x + j * 1.5;
      const by = p.y + rnd(-1, 1) * 18;
      const cx = slot.x + (bx - slot.x) * 0.25;
      const cy = slot.y - 45;
      const frames = [];
      let prevA = null;
      let bank = 0;
      for (let k = 0; k <= N; k++) {
        const t = k / N;
        const u = settle(t);
        const x = bez(ax, bx, cx, slot.x, u) - slot.x;
        const y = bez(ay, by, cy, slot.y, u) - slot.y;
        // banking: lean into the turn the curve is making (not a random tilt)
        const u2 = Math.min(1, u + 0.02);
        const a = Math.atan2(bez(ay, by, cy, slot.y, u2) - bez(ay, by, cy, slot.y, u), bez(ax, bx, cx, slot.x, u2) - bez(ax, bx, cx, slot.x, u));
        if (prevA !== null) {
          let d = a - prevA;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          bank = bank * 0.6 + Math.max(-28, Math.min(28, (d * 180) / Math.PI * 4)) * 0.4;
        }
        prevA = a;
        const sc = e.s + (1 - e.s) * u;
        const lean = k === N ? 0 : bank * (1 - t);
        frames.push({
          transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${lean.toFixed(1)}deg) scale(${sc.toFixed(3)})`,
          opacity: t < 0.06 ? t / 0.06 : 1,
          offset: t,
        });
      }
      const fly = (cls, op, lag, fade) => {
        const img = document.createElement('img');
        img.className = cls;
        img.alt = '';
        img.src = url;
        img.style.left = `${slot.x - 18}px`;
        img.style.top = `${slot.y - 18}px`;
        layer.appendChild(img);
        const kf = frames.map((f, k) => ({ ...f, opacity: f.opacity * op * (fade && k > N * 0.7 ? Math.max(0, 1 - (k - N * 0.7) / (N * 0.3)) : 1) }));
        const a = img.animate(kf, { duration: dur, delay: delay + lag, easing: 'linear', fill: 'both' });
        return { img, a };
      };
      // a faint trail of ghosts behind it (they fade out before it lands)
      for (const [op, lag] of [[0.32, 45], [0.14, 95]]) {
        const g = fly('skill-flyer is-ghost', op, lag, true);
        g.a.onfinish = () => g.img.remove();
      }
      const { img, a } = fly('skill-flyer', 1, 0, false);
      a.onfinish = () => {
        // landing: it squashes like a drop of ink, and melts into the slug
        const out = img.animate(
          [
            { transform: 'scale(1)', opacity: 1 },
            { transform: 'scale(1.22, 0.76)', opacity: 1, offset: 0.25 },
            { transform: 'scale(0.86, 1.05)', opacity: 0.8, offset: 0.55 },
            { transform: 'scale(0.55)', opacity: 0 },
          ],
          { duration: 440, easing: 'ease-out', fill: 'forwards' }
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
