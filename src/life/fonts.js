/**
 * When the page's faces come in. The first frame is set in system fonts sized
 * to stand in for them (src/styles/fonts.css), so a face swapping in later
 * doesn't re-wrap or move anything. The faces the first screen sets are only
 * declared once that frame has painted, so nothing is fetched ahead of the
 * script that draws it; the rest (the heads further down, the pen, the
 * italics) once the page has loaded too. scripts/fonts/build.py writes both
 * stylesheets.
 */
let painted;
const firstFrame = new Promise((resolve) => (painted = resolve));
const firstFaces = firstFrame.then(() => import('../styles/fonts-first.css')).catch(() => {});
const loaded = new Promise((resolve) =>
  document.readyState === 'complete' ? resolve() : window.addEventListener('load', resolve, { once: true }),
);
Promise.all([firstFaces, loaded]).then(() => import('../styles/fonts-late.css')).catch(() => {});

/**
 * Called once the app has committed its first render: its frame paints, then
 * the faces are declared. A window that isn't drawing frames (a background
 * tab, an occluded one) gets them anyway, after a moment.
 */
export function startFonts() {
  requestAnimationFrame(() => setTimeout(painted, 0));
  setTimeout(painted, 400);
}

/**
 * Anything that shouldn't be seen in a stand-in at all — the loader rolling
 * out the nameplate — waits here: until the faces it sets first have loaded,
 * or `ms` at most, whichever comes first. (Asking for a face before it's
 * declared answers at once, with nothing, so it waits for that first.)
 */
export function fontsReady(ms = 1000, faces = ['900 1em "Fraunces Nameplate"', '400 1em Newsreader']) {
  const ready = firstFaces.then(() => Promise.all(faces.map((f) => document.fonts?.load(f)))).catch(() => {});
  return Promise.race([ready, new Promise((resolve) => setTimeout(resolve, ms))]);
}
