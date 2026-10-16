import { prefs } from './prefs';
import { SKILL_ICONS } from '../data/skillIcons';

/**
 * Every skill has something inside it. Point at a slug and its icon peeks up
 * from behind it (that's the hint that it's worth a click); click and the icon
 * pops out and floats away — up and off to one side, swaying as it goes,
 * turning, fading — like a bubble let go of, not a stone dropped. Brand marks
 * in their own colours, the generic ones hand-drawn in ink (see
 * src/data/skillIcons.js for which is which). Once, the first time the case is
 * set, a few slugs peek on their own so you know.
 *
 * The icons load the first time they're wanted. Reduced motion: the icon
 * appears above the slug and fades, no float.
 */
const INK = '#1c140e';
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

export function startSkillPops(section) {
  if (!section) return () => {};
  const layer = document.createElement('div');
  layer.className = 'skill-pops';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  let live = 0;

  const peekOf = (slug) => {
    let img = slug.querySelector(':scope > .skill-peek');
    const url = urls?.[slug.textContent.trim()];
    if (!img && url) {
      img = document.createElement('img');
      img.className = 'skill-peek';
      img.alt = '';
      img.src = url;
      slug.appendChild(img);
    }
    return img;
  };

  const onOver = async (e) => {
    const slug = e.target.closest?.('.skill');
    if (!slug) return;
    await loadIcons();
    peekOf(slug);
  };

  const onClick = async (e) => {
    const slug = e.target.closest?.('.skill');
    if (!slug) return;
    await loadIcons();
    const url = urls[slug.textContent.trim()];
    if (!url || live > 18) return;
    const r = slug.getBoundingClientRect();
    const img = document.createElement('img');
    img.className = 'skill-pop';
    img.alt = '';
    img.src = url;
    img.style.left = `${r.left + r.width / 2 - 18}px`;
    img.style.top = `${r.top - 20}px`;
    layer.appendChild(img);
    live++;
    slug.animate([{ scale: 1 }, { scale: 0.93 }, { scale: 1.03 }, { scale: 1 }], { duration: 380, easing: 'ease-out' });
    let a;
    if (prefs.reduced) {
      a = img.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: 1400 });
    } else {
      // up and away to one side, swaying: fast off the mark, then drifting
      const side = Math.random() < 0.5 ? -1 : 1;
      const dx = side * (70 + Math.random() * 110);
      const dy = -(130 + Math.random() * 110);
      const spin = side * (10 + Math.random() * 30);
      const frames = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        const go = 1 - (1 - t) ** 2.4; // quick to leave, slow to drift
        const sway = Math.sin(t * Math.PI * 2.2) * 16 * (1 - t * 0.4);
        frames.push({
          transform: `translate(${(dx * go + sway).toFixed(1)}px, ${(dy * go).toFixed(1)}px) rotate(${(spin * go + sway * 0.6).toFixed(1)}deg) scale(${(k === 0 ? 0.4 : k === 1 ? 1.25 : 1.1 - t * 0.25).toFixed(2)})`,
          opacity: t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35,
        });
      }
      a = img.animate(frames, { duration: 2600 + Math.random() * 600, easing: 'linear' });
    }
    a.onfinish = () => {
      img.remove();
      live--;
    };
  };

  // the first time the case is set: a few slugs peek on their own
  let teased = false;
  const io = new IntersectionObserver(
    async ([e]) => {
      if (!e.isIntersecting || teased) return;
      teased = true;
      io.disconnect();
      await loadIcons();
      const slugs = [...section.querySelectorAll('.skill')];
      const picks = [3, 17, 31].map((i) => slugs[i % slugs.length]).filter(Boolean);
      picks.forEach((slug, k) =>
        setTimeout(() => {
          const img = peekOf(slug);
          if (!img) return;
          slug.classList.add('is-teasing');
          setTimeout(() => slug.classList.remove('is-teasing'), 1100);
        }, 1600 + k * 700)
      );
    },
    { threshold: 0.55 }
  );
  const grid = section.querySelector('.skill-index');
  if (grid) io.observe(grid);

  section.addEventListener('pointerover', onOver);
  section.addEventListener('click', onClick);
  return () => {
    io.disconnect();
    section.removeEventListener('pointerover', onOver);
    section.removeEventListener('click', onClick);
    layer.remove();
  };
}
