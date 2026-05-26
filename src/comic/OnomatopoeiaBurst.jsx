import { useEffect, useState } from 'react';

/**
 * A single burst of an onomatopoeia word at a fixed point.
 * Lifecycle: animates in/out via the CSS .onom keyframe, calls onDone after.
 * Used by:
 *   - OnomatopoeiaTrail (global click bursts)
 *   - Skills physics (collision bursts)
 *   - Any imperative usage via the dispatchOnom() helper exported below.
 */
export function OnomatopoeiaBurst({ word, x, y, rotation = 0, color, onDone, fontSize = 44 }) {
  useEffect(() => {
    const id = setTimeout(() => onDone?.(), 720);
    return () => clearTimeout(id);
    // Burst is fire-and-forget; intentionally ignore onDone identity churn
    // so each instance lives exactly 720ms regardless of parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span
      className="onom-anchor"
      style={{ left: x, top: y }}
    >
      <span
        className="onom"
        style={{
          ['--rot']: `${rotation}deg`,
          ...(color ? { color } : null),
          fontSize,
        }}
      >
        {word}
      </span>
    </span>
  );
}

/**
 * Imperative dispatcher — fires a custom event the OnomatopoeiaTrail listens
 * to. Lets non-React physics callbacks trigger bursts without prop drilling.
 */
export function dispatchOnom({ word, x, y, rotation = 0, color, fontSize }) {
  window.dispatchEvent(
    new CustomEvent('onom-burst', {
      detail: { word, x, y, rotation, color, fontSize },
    })
  );
}

/**
 * Pool of vocab words used by the trail when the click target doesn't
 * have a more specific word. Exported so callers can roll their own.
 */
export const ONOM_POOL = {
  default: ['POW!', 'BAM!', 'ZAP!', 'SNAP!', 'WHIP!', 'WHAM!', 'ZING!'],
  github:  ['FORK!', 'CLONE!', 'PR!'],
  live:    ['BOOM!', 'LIVE!', 'SHIP!'],
  email:   ['SEND!', 'PING!', 'WHOOSH!'],
  blog:    ['WORD!', 'INK!', 'POST!'],
  resume:  ['BOOM!', 'WHAM!'],
  skill:   ['CRACK!', 'POW!', 'BAM!', 'CLINK!'],
};

export function pickOnomFor(el) {
  if (!el) return randomFrom(ONOM_POOL.default);
  const href = el.getAttribute?.('href') || '';
  const aria = (el.getAttribute?.('aria-label') || '').toLowerCase();
  if (href.includes('github')) return randomFrom(ONOM_POOL.github);
  if (href.startsWith('mailto')) return randomFrom(ONOM_POOL.email);
  if (href.includes('linkedin')) return 'CONNECT!';
  if (href.includes('blog') || href.includes('post')) return randomFrom(ONOM_POOL.blog);
  if (aria.includes('resume') || aria.includes('cv')) return randomFrom(ONOM_POOL.resume);
  return randomFrom(ONOM_POOL.default);
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
