/**
 * Things to find — the little things on the page that do something, as a
 * list in Page settings that ticks itself off as you come across them (you
 * can't tick them by hand). Remembered on this device: a per-viewer
 * convenience, so plain localStorage, and the page works the same without it.
 *
 *   found('twist')   → marks one found (once), tells anyone listening
 *   isFound('twist') / onFound(fn) → read it, or hear about it
 */
export const FINDS = [
  { key: 'ripple', label: 'Make a wave on the paper' },
  { key: 'pen', label: 'Swap your pen' },
  { key: 'twist', label: 'Turn a face of the cube' },
  { key: 'orbit', label: 'Spin the whole cube round' },
  { key: 'bug', label: 'Catch the bug' },
  { key: 'boulder', label: 'Get the van to toss the boulder' },
  { key: 'stamp', label: 'Spin the postage stamp' },
  { key: 'sheet', label: 'Leave a stamp on the sheet' },
  { key: 'car', label: 'Find the car' },
  { key: 'solved', label: 'See the cube solved' },
];

const KEY = 'press-finds';
const read = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
};
const got = read();
const listeners = new Set();

export const isFound = (key) => got.has(key);
export const foundCount = () => FINDS.filter((f) => got.has(f.key)).length;

export function found(key) {
  if (got.has(key) || !FINDS.some((f) => f.key === key)) return;
  got.add(key);
  try {
    localStorage.setItem(KEY, JSON.stringify([...got]));
  } catch {
    /* fine: it just won't be remembered */
  }
  listeners.forEach((fn) => fn(key));
}

export function onFound(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
