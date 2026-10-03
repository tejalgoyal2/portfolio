/**
 * Live motion preferences. Read prefs.reduced / prefs.fine at the moment you
 * need them (they follow the OS setting if it changes mid-visit); subscribe
 * with onPrefsChange for anything that has to rebuild.
 */
const mq = (q) => (typeof window !== 'undefined' ? window.matchMedia(q) : null);
const reducedQ = mq('(prefers-reduced-motion: reduce)');
const fineQ = mq('(pointer: fine)');

export const prefs = {
  reduced: !!reducedQ?.matches,
  fine: !!fineQ?.matches,
};

const subs = new Set();
const emit = () => subs.forEach((fn) => fn(prefs));
reducedQ?.addEventListener('change', (e) => {
  prefs.reduced = e.matches;
  emit();
});
fineQ?.addEventListener('change', (e) => {
  prefs.fine = e.matches;
  emit();
});

export function onPrefsChange(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
