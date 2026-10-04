import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { prefs } from './prefs';

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Paragraphs ink in line by line as they come up the page: each line goes
 * from ghost to full ink while its top travels from 92% to 66% of the
 * viewport, scrubbed to the scroll (scroll back and it ghosts again). By the
 * time a line reaches the reading zone it is always fully inked, and nothing
 * ever moves — it's opacity only. Lines are re-split when the width or fonts
 * change. Reduced motion: text is simply printed.
 *
 * Mark a paragraph with data-ink to opt it in. Use data-ink="block" for a
 * short item with live React children (a redaction, a counter), or one with a
 * floated drop cap: it inks as one piece, because splitting would replace the
 * nodes React is holding, or re-flow the lines around the float.
 */
const GHOST = 0.2;
const FROM = 0.92;
const TO = 0.66;

export function startInkLines(root = document) {
  if (prefs.reduced) return () => {};
  const els = [...root.querySelectorAll('[data-ink]')];
  const blocks = els
    .filter((el) => el.dataset.ink === 'block')
    .map((el) =>
      gsap.fromTo(
        el,
        { opacity: GHOST },
        { opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: `top ${FROM * 100}%`, end: `top ${TO * 100}%`, scrub: true } }
      )
    );
  const splits = els.filter((el) => el.dataset.ink !== 'block').map((el) =>
    SplitText.create(el, {
      type: 'lines',
      linesClass: 'ink-line',
      autoSplit: true,
      aria: 'none', // the lines are plain text in order; no labels needed on a <p>
      onSplit(self) {
        const vh = window.innerHeight;
        const elTop = el.getBoundingClientRect().top;
        const band = (FROM - TO) * vh;
        const total = el.offsetHeight + band;
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: `top ${FROM * 100}%`, end: `bottom ${TO * 100}%`, scrub: true },
        });
        tl.set({}, {}, 1); // the timeline spans the whole trigger range
        for (const line of self.lines) {
          const off = line.getBoundingClientRect().top - elTop;
          tl.fromTo(line, { opacity: GHOST }, { opacity: 1, ease: 'none', duration: band / total }, Math.max(0, off) / total);
        }
        return tl;
      },
    })
  );
  return () => {
    blocks.forEach((t) => t.revert());
    splits.forEach((s) => s.revert());
  };
}
