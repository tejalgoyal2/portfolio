/**
 * The page's fonts come in without holding up the first paint (index.html
 * preloads the stylesheet and switches it on when it lands). Anything that
 * shouldn't be seen in a fallback face — the loader rolling out the
 * nameplate — waits here: until the stylesheet is in and the two faces it
 * sets first have loaded, or `ms` at most, whichever comes first. (Asking
 * for a face before its stylesheet is in answers at once, with nothing, so
 * it always waits for the sheet first.)
 */
export function fontsReady(ms = 1000, faces = ['900 1em Fraunces', '400 1em Newsreader']) {
  const link = document.getElementById('press-fonts');
  const sheet = new Promise((resolve) => {
    if (!link || link.rel === 'stylesheet') return resolve();
    link.addEventListener('load', () => setTimeout(resolve, 0), { once: true });
    link.addEventListener('error', resolve, { once: true });
  });
  const loaded = sheet
    .then(() => Promise.all(faces.map((f) => document.fonts?.load(f))))
    .catch(() => {});
  return Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, ms))]);
}
