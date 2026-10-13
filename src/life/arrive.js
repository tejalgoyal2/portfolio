import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefs } from './prefs';
import { SECTIONS } from '../data/sections';

gsap.registerPlugin(ScrollTrigger);

/**
 * How things come onto the page and leave it — the paste-up desk.
 *
 * Blocks arrive the way material lands on a layout table: case files are dealt
 * onto the desk from either side, feature files are laid down from below,
 * skills are set into the stick sort by sort, ledger rows and classifieds are
 * pasted in from the margin, margin notes are pinned on. On the way out they're
 * cleared away just as deliberately: files are filed up and back, ledger rows
 * slide off the galley, skills are pied (the sorts spill), the nameplate's
 * letters are distributed back to the case, headlines lift off.
 *
 * All of it is scrubbed to the scroll, so it plays backwards as you scroll
 * back up. An arrival finishes while the block is still low on the screen
 * (top at 72%) and an exit only starts once its bottom is in the top fifth, so
 * nothing moves in the zone where you're reading. Transforms and opacity only,
 * through CSS variables (--ax/--ay/--ar/--as/--ao in, --dx/--dy/--dr/--ds/--do
 * out, composed in press.css), so they never fight a block's own hover
 * transform. Reduced motion: nothing moves; everything is simply there.
 *
 * Between sections, each one's name is set as a huge outlined banner behind
 * its header — PROFILE, SKILLS, WORK — that slides across as the section
 * comes up the page, like the section flag of a broadsheet passing under the
 * press roller. Decorative only (aria-hidden), faint, and behind the text.
 *
 * Markup: data-arrive="deal-l | deal-r | rise | paste | pin | drop" and
 * data-depart="file | lift | slide | part-l | part-r" on a block;
 * data-arrive-items="set | pin | paste | drop" and data-depart-items="pi" on a
 * container, which moves its children with a stagger.
 */

const IN = { start: 'top 98%', end: 'top 72%' };
const OUT = { start: 'bottom 22%', end: 'bottom 0%' };
const rnd = (a, b) => a + Math.random() * (b - a);

const ARRIVE = {
  'deal-l': () => ({ '--ax': '-120px', '--ay': '46px', '--ar': '-6deg', '--ao': 0 }),
  'deal-r': () => ({ '--ax': '120px', '--ay': '46px', '--ar': '6deg', '--ao': 0 }),
  rise: () => ({ '--ay': '96px', '--as': 0.94, '--ao': 0 }),
  paste: () => ({ '--ax': '-72px', '--ao': 0 }),
  pin: () => ({ '--ar': `${rnd(-16, -8)}deg`, '--as': 1.22, '--ao': 0 }),
  drop: () => ({ '--ay': '-64px', '--ar': `${rnd(-4, 4)}deg`, '--ao': 0 }),
  set: () => ({ '--ay': '-40px', '--ar': `${rnd(-12, 12)}deg`, '--ao': 0 }),
};
const ARRIVED = { '--ax': '0px', '--ay': '0px', '--ar': '0deg', '--as': 1, '--ao': 1 };

const DEPART = {
  file: () => ({ '--dy': '-56px', '--ds': 0.95, '--do': 0.3 }),
  lift: () => ({ '--dy': '-72px', '--do': 0 }),
  slide: () => ({ '--dx': '-96px', '--do': 0 }),
  'part-l': () => ({ '--dx': '-70px', '--dr': '-3deg', '--do': 0.2 }),
  'part-r': () => ({ '--dx': '70px', '--dr': '3deg', '--do': 0.2 }),
  // type pied: the sorts spill off the line and tumble down
  pi: () => ({ '--dx': `${rnd(-60, 60)}px`, '--dy': `${rnd(24, 90)}px`, '--dr': `${rnd(-40, 40)}deg`, '--do': 0 }),
  // the nameplate distributed back to the case, letter by letter
  distribute: () => ({ '--dy': `${rnd(-170, -50)}px`, '--dr': `${rnd(-9, 9)}deg`, '--do': 0 }),
};
const HOME = { '--dx': '0px', '--dy': '0px', '--dr': '0deg', '--ds': 1, '--do': 1 };

function scrubbed(trigger, range, build) {
  const tl = gsap.timeline({ scrollTrigger: { trigger, start: range.start, end: range.end, scrub: true } });
  build(tl);
  return tl;
}

/**
 * The banners: one huge outlined section name behind each section after the
 * front page. It slides along as the section passes, and fills with a faint
 * wash of ink as you read through it — a progress gauge set in wood type —
 * while a press-red copy rides a hair off-register and only settles home
 * once you've read to the end.
 */
function banners(root, made) {
  for (const { key, label } of SECTIONS.slice(1)) {
    const section = root.querySelector(`[data-section="${key}"]`);
    if (!section) continue;
    const el = document.createElement('span');
    el.className = 'folio';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<span class="folio-line">${label}</span><span class="folio-fill">${label}</span><span class="folio-reg">${label}</span>`;
    section.prepend(el);
    const fill = el.querySelector('.folio-fill');
    const reg = el.querySelector('.folio-reg');
    if (prefs.reduced) {
      fill.style.clipPath = 'none';
      made.push({ revert: () => el.remove() });
      continue;
    }
    const slide = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top bottom', end: 'top -60%', scrub: true } });
    slide.fromTo(el, { xPercent: 18 }, { xPercent: -42, ease: 'none' });
    const read = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top 70%', end: 'bottom 70%', scrub: 0.6 } });
    read
      .fromTo(fill, { clipPath: 'inset(-10% 100% -10% 0)' }, { clipPath: 'inset(-10% 0% -10% 0)', ease: 'none' }, 0)
      .fromTo(reg, { x: 14, y: -9, rotate: -0.6 }, { x: 0, y: 0, rotate: 0, ease: 'power2.in' }, 0);
    made.push({ revert: () => (slide.revert(), read.revert(), el.remove()) });
  }
}

export function startArrivals(root = document) {
  const made = [];
  banners(root, made);
  if (prefs.reduced) return () => made.forEach((t) => t.revert());

  for (const el of root.querySelectorAll('[data-arrive]')) {
    const fx = ARRIVE[el.dataset.arrive];
    if (fx) made.push(scrubbed(el, IN, (tl) => tl.fromTo(el, fx(), { ...ARRIVED, ease: 'power2.out' })));
  }
  for (const box of root.querySelectorAll('[data-arrive-items]')) {
    const fx = ARRIVE[box.dataset.arriveItems];
    const items = [...box.children];
    if (!fx || !items.length) continue;
    made.push(
      scrubbed(box, IN, (tl) =>
        items.forEach((it, i) => tl.fromTo(it, fx(), { ...ARRIVED, ease: 'back.out(1.6)', duration: 0.5 }, (i / items.length) * 0.6))
      )
    );
  }
  for (const el of root.querySelectorAll('[data-depart]')) {
    const fx = DEPART[el.dataset.depart];
    if (fx) made.push(scrubbed(el, OUT, (tl) => tl.fromTo(el, HOME, { ...fx(), ease: 'power1.in' })));
  }
  for (const box of root.querySelectorAll('[data-depart-items]')) {
    const fx = DEPART[box.dataset.departItems];
    const items = [...box.children];
    if (!fx || !items.length) continue;
    // the nameplate leaves with the whole front page, not just its own last line
    const range = box.dataset.departItems === 'distribute' ? { start: 1, end: 'bottom top' } : OUT;
    made.push(
      scrubbed(box, range, (tl) =>
        items.forEach((it, i) => tl.fromTo(it, HOME, { ...fx(), ease: 'power1.in', duration: 0.6 }, (i / items.length) * 0.4))
      )
    );
  }

  return () => made.forEach((tl) => tl.revert());
}
