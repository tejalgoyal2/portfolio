/**
 * The page's fonts come in without holding up the first paint (index.html
 * preloads the stylesheet and switches it on when it lands). Anything that
 * shouldn't be seen in a fallback face — the loader rolling out the
 * nameplate — waits here: until the stylesheet is in and the two faces it
 * sets first have loaded, or `ms` at most, whichever comes first.
 */
export function fontsReady(ms = 1000) {
  const link = document.getElementById('press-fonts');
  const sheet = new Promise((resolve) => {
    if (!link || link.rel === 'stylesheet') return resolve();
    link.addEventListener('load', () => setTimeout(resolve, 0), { once: true });
    link.addEventListener('error', resolve, { once: true });
  });
  const faces = sheet
    .then(() => Promise.all(['900 1em Fraunces', '400 1em Newsreader'].map((f) => document.fonts?.load(f))))
    .catch(() => {});
  return Promise.race([faces, new Promise((resolve) => setTimeout(resolve, ms))]);
}
