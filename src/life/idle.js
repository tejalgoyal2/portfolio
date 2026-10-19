/**
 * Run `fn` once the press has finished printing (the loader has lifted) and
 * the browser is idle, so the life layer's setup never competes with first
 * paint. Returns a cancel.
 */
export function afterPrint(fn) {
  let cancelled = false;
  let cleanup = null;
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 120));
  const go = () =>
    idle(
      () => {
        if (!cancelled) cleanup = fn() || null;
      },
      { timeout: 1500 }
    );
  if (sessionStorage.getItem('press-loaded')) go();
  else window.addEventListener('press:loaded', go, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('press:loaded', go);
    cleanup?.();
  };
}
