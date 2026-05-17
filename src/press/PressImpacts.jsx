import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Press impacts — the comic onomatopoeia, retooled. The v2 bug was that bursts
 * fired on idle physics settles, spamming the screen. Here NOTHING auto-fires:
 * a burst only appears when a user action calls fireImpact() (a skill throw past
 * a velocity threshold, a stamp click, the loader). This layer just renders what
 * it's told, capped and short-lived.
 */

export const IMPACT_WORDS = ['CHA-CHUNK', 'KER-CHUNK', 'CLACK', 'STAMP', 'THWACK', 'KLAK'];

export function pickImpact() {
  return IMPACT_WORDS[(Math.random() * IMPACT_WORDS.length) | 0];
}

/** Dispatch an impact. Call this from user-driven handlers only. */
export function fireImpact(word, x, y, tone = 'ink') {
  window.dispatchEvent(
    new CustomEvent('press:impact', { detail: { word, x, y, tone } })
  );
}

const MAX_CONCURRENT = 8;
const LIFE_MS = 700;
let uid = 0;

export default function PressImpacts() {
  const [bursts, setBursts] = useState([]);

  const remove = useCallback((id) => {
    setBursts((list) => list.filter((b) => b.id !== id));
  }, []);

  useEffect(() => {
    const onImpact = (e) => {
      const { word, x, y, tone } = e.detail || {};
      const id = ++uid;
      const rot = (Math.random() * 16 - 8).toFixed(1);
      setBursts((list) => {
        const next = [...list, { id, word: word || pickImpact(), x, y, tone, rot }];
        return next.length > MAX_CONCURRENT ? next.slice(next.length - MAX_CONCURRENT) : next;
      });
      setTimeout(() => remove(id), LIFE_MS);
    };
    window.addEventListener('press:impact', onImpact);
    return () => window.removeEventListener('press:impact', onImpact);
  }, [remove]);

  return createPortal(
    <div className="press-impacts" aria-hidden="true">
      {bursts.map((b) => (
        <span
          key={b.id}
          className={`press-impact press-impact--${b.tone}`}
          style={{ left: b.x, top: b.y, '--rot': `${b.rot}deg` }}
        >
          {b.word}
        </span>
      ))}
    </div>,
    document.body
  );
}
