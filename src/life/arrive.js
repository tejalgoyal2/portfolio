import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefs } from './prefs';
import { SECTIONS } from '../data/sections';

gsap.registerPlugin(ScrollTrigger);

/**
 * How things come onto the page and leave it — the paste-up desk.
 *
 * Blocks arrive the way material lands on a layout table: the lead files land
 * together, each a short way in from its own side, feature files are laid down from below,
 * skills are set into the stick sort by sort, ledger rows and classifieds are
 * pasted in from the margin, margin notes are pinned on. On the way out they're
 * cleared away just as deliberately: files are filed up and back, ledger rows
 * slide off the galley, skills are pied (the sorts spill), headlines lift off.
 * The nameplate stays put and simply scrolls away, like the masthead it is.
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
 * Nothing tilts: every move is a straight slide, a settle in scale, or ink.
 *
 * Markup: data-arrive="deal-l | deal-r | rise | paste | pin | drop | stamp" and
 * data-depart="file | lift | slide | peel | part-l | part-r" on a block;
 * data-arrive-items="set | pin | paste | drop | lay | tick" and data-depart-items="pi" on a
 * container, which moves its children with a stagger; data-land="left | right |
 * top | bottom" on the lead files, which play in time rather than with the scroll.
 */

const IN = { start: 'top 98%', end: 'top 72%' };
const OUT = { start: 'bottom 22%', end: 'bottom 0%' };
const rnd = (a, b) => a + Math.random() * (b - a);

const ARRIVE = {
  'deal-l': () => ({ '--ax': '-90px', '--ay': '30px', '--ao': 0 }),
  'deal-r': () => ({ '--ax': '90px', '--ay': '30px', '--ao': 0 }),
  rise: () => ({ '--ay': '72px', '--as': 0.96, '--ao': 0 }),
  paste: () => ({ '--ax': '-56px', '--ao': 0 }),
  pin: () => ({ '--as': 1.16, '--ao': 0 }),
  drop: () => ({ '--ay': '-44px', '--ao': 0 }),
  set: () => ({ '--ay': '-28px', '--ao': 0 }),
  // a ledger entry: its date stamped on, its lines laid down, its figures set in from the margin
  stamp: () => ({ '--as': 1.28, '--ao': 0 }),
  lay: () => ({ '--ay': '22px', '--ao': 0 }),
  tick: () => ({ '--ax': '24px', '--ao': 0 }),
};
const ARRIVED = { '--ax': '0px', '--ay': '0px', '--ar': '0deg', '--as': 1, '--ao': 1 };

const DEPART = {
  file: () => ({ '--dy': '-56px', '--ds': 0.95, '--do': 0.3 }),
  lift: () => ({ '--dy': '-72px', '--do': 0 }),
  slide: () => ({ '--dx': '-96px', '--do': 0 }),
  // lifted off the board
  peel: () => ({ '--dy': '-48px', '--ds': 0.98, '--do': 0.15 }),
  'part-l': () => ({ '--dx': '-70px', '--do': 0.2 }),
  'part-r': () => ({ '--dx': '70px', '--do': 0.2 }),
  // type pied: the sorts spill off the line
  pi: () => ({ '--dx': `${rnd(-50, 50)}px`, '--dy': `${rnd(24, 80)}px`, '--do': 0 }),
};
// the lead files: a short way in from their own side, all landing at once
const LAND = {
  left: { '--ax': '-44px' },
  right: { '--ax': '44px' },
  top: { '--ay': '-36px' },
  bottom: { '--ay': '36px' },
};
const HOME = { '--dx': '0px', '--dy': '0px', '--dr': '0deg', '--ds': 1, '--do': 1 };

function scrubbed(trigger, range, build) {
  // scrubbed with a little lag, so a fling of the wheel is eased, never a snap
  const tl = gsap.timeline({ scrollTrigger: { trigger, start: range.start, end: range.end, scrub: 0.45 } });
  build(tl);
  return tl;
}

export function startArrivals(root = document) {
  const made = [];
  if (prefs.reduced) return () => {};

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
        items.forEach((it, i) => tl.fromTo(it, fx(), { ...ARRIVED, ease: 'power3.out', duration: 0.5 }, (i / items.length) * 0.6))
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
    made.push(
      scrubbed(box, OUT, (tl) =>
        items.forEach((it, i) => tl.fromTo(it, HOME, { ...fx(), ease: 'power1.in', duration: 0.6 }, (i / items.length) * 0.4))
      )
    );
  }

  // the lead files aren't scrubbed: once their desk is coming up the page they
  // all land together, so by the time you're reading them every one is down
  const desks = new Set([...root.querySelectorAll('[data-land]')].map((el) => el.parentElement));
  for (const desk of desks) {
    const files = [...desk.children].filter((el) => el.dataset.land);
    const tl = gsap.timeline({ paused: true });
    files.forEach((el, i) =>
      tl.fromTo(
        el,
        { ...LAND[el.dataset.land], '--as': 0.98, '--ao': 0 },
        { ...ARRIVED, duration: 0.85, ease: 'expo.out' },
        i * 0.07
      )
    );
    ScrollTrigger.create({
      trigger: desk,
      start: 'top 82%',
      onEnter: () => tl.play(),
      onLeaveBack: () => tl.reverse(),
    });
    made.push(tl);
  }

  return () => made.forEach((tl) => tl.revert());
}
