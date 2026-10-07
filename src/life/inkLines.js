import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { prefs } from './prefs';

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Paragraphs ink in line by line as they come up the page: each line goes
 * from ghost to full ink while its top travels from 92% to 66% of the
 * viewport, scrubbed to the scroll (scroll back and it ghosts again). Nothing
 * ever moves — it's opacity only. Lines are re-split when the width or fonts
 * change. Reduced motion: text is simply printed.
 *
 * The ghost is never faint enough to fail a reader: each paragraph starts at
 * the lowest opacity that still keeps its own colour at 4.6:1 against its own
 * background (ink on cream ≈ 0.6, the softer greys higher, cream on ink ≈ 0.55).
 *
 * Mark a paragraph with data-ink to opt it in. Use data-ink="block" for a
 * short item with live React children (a redaction, a counter), or one with a
 * floated drop cap: it inks as one piece, because splitting would replace the
 * nodes React is holding, or re-flow the lines around the float.
 */
const FROM = 0.92;
const TO = 0.66;
const AA = 4.6;

// ---- the lowest opacity that keeps this text readable on its own ground
let probe = null;
function rgba(css) {
  probe ||= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000';
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255];
}
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const mix = (fg, bg, a) => [0, 1, 2].map((i) => bg[i] * (1 - a) + fg[i] * a);
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

function ghostFor(el) {
  let bg = [0.957, 0.941, 0.902];
  for (let n = el; n; n = n.parentElement) {
    const c = rgba(getComputedStyle(n).backgroundColor);
    if (c[3] > 0.5) {
      bg = c;
      break;
    }
  }
  const f = rgba(getComputedStyle(el).color);
  const fg = mix(f, bg, f[3]);
  for (let a = 0.3; a < 1; a += 0.02) if (contrast(mix(fg, bg, a), bg) >= AA) return Math.min(0.92, a);
  return 1;
}

export function startInkLines(root = document) {
  if (prefs.reduced) return () => {};
  const els = [...root.querySelectorAll('[data-ink]')];
  const trigger = (el) => ({ trigger: el, start: `top ${FROM * 100}%`, end: `bottom ${TO * 100}%`, scrub: true });

  const blocks = els
    .filter((el) => el.dataset.ink === 'block')
    .map((el) =>
      gsap.fromTo(
        el,
        { opacity: ghostFor(el) },
        { opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: `top ${FROM * 100}%`, end: `top ${TO * 100}%`, scrub: true } }
      )
    );

  const splits = els
    .filter((el) => el.dataset.ink !== 'block')
    .map((el) => {
      const ghost = ghostFor(el);
      return SplitText.create(el, {
        type: 'lines',
        linesClass: 'ink-line',
        autoSplit: true,
        aria: 'none', // the lines are plain text in order; no labels needed on a <p>
        onSplit(self) {
          const vh = window.innerHeight;
          const elTop = el.getBoundingClientRect().top;
          const band = (FROM - TO) * vh;
          const total = el.offsetHeight + band;
          const tl = gsap.timeline({ scrollTrigger: trigger(el) });
          tl.set({}, {}, 1); // the timeline spans the whole trigger range
          for (const line of self.lines) {
            const off = line.getBoundingClientRect().top - elTop;
            tl.fromTo(line, { opacity: ghost }, { opacity: 1, ease: 'none', duration: band / total }, Math.max(0, off) / total);
          }
          return tl;
        },
      });
    });

  return () => {
    blocks.forEach((t) => t.revert());
    splits.forEach((s) => s.revert());
  };
}
