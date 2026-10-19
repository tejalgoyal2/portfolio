import { onLayout } from './layout';
import { scroll } from './scroll';

/**
 * Which stock the press is printing on at a given height: 'paper' (cream),
 * 'ink' (the dark-red spreads) or 'red' (the Contact finale). Sections declare
 * it with data-ground; this caches their document bands so every effect can
 * pick colours designed for the ground it lands on.
 */
let bands = [];

function measure() {
  const y = window.scrollY;
  bands = [...document.querySelectorAll('[data-ground]')]
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + y, bottom: r.bottom + y, ground: el.dataset.ground };
    })
    .sort((a, b) => a.top - b.top);
}

let started = false;
export function startGround() {
  if (started) return;
  started = true;
  measure();
  onLayout(measure);
}

export function groundAtDoc(docY) {
  for (const b of bands) if (docY >= b.top && docY < b.bottom) return b.ground;
  return 'paper';
}

export const groundAt = (clientY) => groundAtDoc(clientY + scroll.y);

/** The document bands, for modules that walk them (the type field). */
export const groundBands = () => bands;
