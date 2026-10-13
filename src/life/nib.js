/**
 * The visitor's pen: which pencil icon is their cursor. Only pointy ones, so
 * the point is where you click: each records where its tip is (in the icon's
 * 24-unit box) and how far to turn it so the tip points up and to the left,
 * like an arrow. Chosen from the chip in the running head or Page settings;
 * remembered on this device (a per-viewer convenience, so plain localStorage).
 * 'system' hands the job back to the OS cursor.
 */
export const NIBS = [
  { name: 'pencil', label: 'Pencil', tip: [3.5, 20.9], rot: 106 },
  { name: 'pen-nib', label: 'Fountain pen', tip: [12.1, 21.7], rot: 151 },
  { name: 'rocket', label: 'Rocket', tip: [12, 2.2], rot: -30 },
  { name: 'zap', label: 'Lightning', tip: [10.4, 21.9], rot: 141 },
  { name: 'set-square', label: 'Set square', tip: [3.7, 20.2], rot: 105 },
  { name: 'drafting-compass', label: 'Compass', tip: [5.6, 20.4], rot: 113 },
  { name: 'mouse-pointer', label: 'Plain arrow', tip: [4.9, 2.8], rot: 0 },
  { name: 'send', label: 'Paper plane', tip: [20.9, 3], rot: -75 },
  { name: 'brush', label: 'Brush', tip: [3.3, 20.5], rot: 104 },
  { name: 'navigation', label: 'Compass needle', tip: [20.8, 2.9], rot: -75 },
  { name: 'crosshair', label: 'Crosshair', tip: [12, 12], rot: 0 },
];
export const SYSTEM = { name: 'system', label: 'Your own cursor' };
/** Pens the page hands you over particular things (not in the chooser). */
export const LOANERS = [{ name: 'eraser', label: 'Eraser', tip: [5, 19], rot: 106 }];
const KEY = 'press-nib';
const subs = new Set();

let current = NIBS[0];
try {
  const saved = localStorage.getItem(KEY);
  current = saved === 'system' ? SYSTEM : NIBS.find((n) => n.name === saved) || NIBS[0];
} catch {
  /* storage blocked: the pencil it is */
}

export const nib = () => current;

export function setNib(name) {
  current = name === 'system' ? SYSTEM : NIBS.find((n) => n.name === name) || NIBS[0];
  try {
    localStorage.setItem(KEY, current.name);
  } catch {
    /* fine */
  }
  subs.forEach((fn) => fn(current));
  return current;
}

/** The next pen along (the system cursor is only chosen from settings). */
export function nextNib() {
  const i = NIBS.indexOf(current);
  return setNib(NIBS[(i + 1) % NIBS.length].name);
}

export function onNib(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
