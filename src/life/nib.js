/**
 * The visitor's pen: which pencil icon rides beside their cursor. A few to
 * choose from, cycled from the chip in the running head; remembered on this
 * device (a per-viewer convenience, so plain localStorage is fine).
 */
export const NIBS = [
  { name: 'pencil', label: 'Pencil' },
  { name: 'pen-nib', label: 'Pen nib' },
  { name: 'drafting-compass', label: 'Compass' },
  { name: 'scissors', label: 'Scissors' },
  { name: 'rocket', label: 'Rocket' },
  { name: 'coffee', label: 'Coffee' },
];
const KEY = 'press-nib';
const subs = new Set();

let current = 0;
try {
  const saved = localStorage.getItem(KEY);
  const i = NIBS.findIndex((n) => n.name === saved);
  if (i >= 0) current = i;
} catch {
  /* storage blocked: the pencil it is */
}

export const nib = () => NIBS[current];

export function nextNib() {
  current = (current + 1) % NIBS.length;
  try {
    localStorage.setItem(KEY, NIBS[current].name);
  } catch {
    /* fine */
  }
  subs.forEach((fn) => fn(NIBS[current]));
  return NIBS[current];
}

export function onNib(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
