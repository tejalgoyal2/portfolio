/**
 * The pencil icons as ready-to-draw images, one per ink. Each icon and ink is
 * rasterised the first time it's asked for, from the vendored SVGs
 * (./icons.js, loaded lazily), into a small canvas, so canvases can blit them
 * with drawImage instead of re-rendering SVG every frame, and only the dozen
 * or so actually on the page are ever made.
 */
export const INKS = {
  ink: '#1c140e', // body-text ink
  paper: '#f4f0e6', // cream
  red: '#d51e22', // press red on cream
  redLift: '#fe433e', // the brighter red the ink spreads use
};

/** Which inks read on each ground: [main, accent]. */
export const INKS_FOR = {
  paper: ['ink', 'red'],
  ink: ['paper', 'redLift'],
  red: ['paper', 'ink'],
};

const cache = new Map(); // px → Promise<{ count, get(i, ink) }>

/**
 * Resolves once the icon list is in, with `count` and `get(i, ink)`: the
 * raster for icon i in that ink, or null the first time while it's being made
 * (a frame or two; ask again).
 */
export function loadSprites(px) {
  if (cache.has(px)) return cache.get(px);
  const job = import('./icons').then(({ ICONS }) => {
    const made = new Map(); // `${i}|${ink}` → canvas, or null while it's being made
    const get = (i, ink) => {
      const key = `${i}|${ink}`;
      if (made.has(key)) return made.get(key);
      made.set(key, null);
      const src = ICONS[i]
        .replace(/stroke="currentColor"/g, `stroke="${INKS[ink]}"`)
        .replace(/width="24" height="24"/, `width="${px}" height="${px}"`);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = px;
        c.height = px;
        c.getContext('2d')?.drawImage(img, 0, 0, px, px);
        made.set(key, c);
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
      return null;
    };
    return { count: ICONS.length, get };
  });
  cache.set(px, job);
  return job;
}
