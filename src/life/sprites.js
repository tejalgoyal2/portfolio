/**
 * The pencil icons as ready-to-draw images, one per ink. Rasterised once per
 * pixel size from the vendored SVGs (./icons.js, loaded lazily), so canvases
 * can blit them with drawImage instead of re-rendering SVG every frame.
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

const cache = new Map(); // px → Promise<Array<Record<ink, HTMLImageElement>>>

export function loadSprites(px) {
  if (cache.has(px)) return cache.get(px);
  const job = import('./icons').then(({ ICONS }) =>
    Promise.all(
      ICONS.map(async (svg) => {
        const set = {};
        await Promise.all(
          Object.entries(INKS).map(
            ([name, hex]) =>
              new Promise((resolve) => {
                const src = svg
                  .replace(/stroke="currentColor"/g, `stroke="${hex}"`)
                  .replace(/width="24" height="24"/, `width="${px}" height="${px}"`);
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
                set[name] = img;
              })
          )
        );
        return set;
      })
    )
  );
  cache.set(px, job);
  return job;
}
