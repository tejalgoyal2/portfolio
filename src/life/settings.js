/**
 * Page settings the visitor can play with (the panel in the running head):
 * how many icons float on the paper, whether a click ripples, whether the cube
 * keeps you company, whether the cube makes a sound. The cursor lives in ./nib.js. Remembered on this device —
 * per-viewer conveniences, so plain localStorage, and the page works the same
 * without it.
 */
const KEY = 'press-settings';
export const DRIFT_LEVELS = [
  { v: 0, label: 'None' },
  { v: 1, label: 'A few' },
  { v: 2, label: 'Plenty' },
  { v: 3.4, label: 'A flood' },
];
const DEFAULTS = { drift: 1, ripples: true, cube: true, sound: true };

export const settings = { ...DEFAULTS };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}'));
} catch {
  /* defaults */
}

const subs = new Set();

export function setSetting(key, value) {
  settings[key] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* fine */
  }
  subs.forEach((fn) => fn(settings, key));
}

export function onSettings(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
