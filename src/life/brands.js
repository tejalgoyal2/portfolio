// Brand marks of the tools I use, from thesvg (see ./brands/LICENSE), as raw
// SVG strings — imported lazily by whatever draws them (the tornado's debris).
// They're drawn as ink silhouettes so they print in the page's own colours.
const files = import.meta.glob('./brands/*.svg', { query: '?raw', import: 'default', eager: true });

/** slug → SVG string */
export const BRAND = Object.fromEntries(Object.entries(files).map(([path, svg]) => [path.split('/').pop().replace('.svg', ''), svg]));

/**
 * Rasterise each mark to a canvas in one flat ink, longest side `px`.
 * Resolves to [{ name, img, w, h }] (aspect kept).
 */
export function brandSprites(px, ink) {
  return Promise.all(
    Object.entries(BRAND).map(
      ([name, svg]) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const ar = (img.naturalWidth || 1) / (img.naturalHeight || 1);
            const w = Math.round(ar >= 1 ? px : px * ar);
            const h = Math.round(ar >= 1 ? px / ar : px);
            const c = document.createElement('canvas');
            c.width = Math.max(1, w);
            c.height = Math.max(1, h);
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, c.width, c.height);
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = ink;
            ctx.fillRect(0, 0, c.width, c.height);
            resolve({ name, img: c, w, h });
          };
          img.onerror = () => resolve(null);
          // size it from its viewBox, so every mark loads at a real size
          const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1]?.split(/[\s,]+/).map(Number);
          const ar = vb && vb[2] > 0 && vb[3] > 0 ? vb[2] / vb[3] : 1;
          const sized = svg.replace(/<svg\b([^>]*)>/, (m, attrs) => {
            const rest = attrs.replace(/\s(width|height)="[^"]*"/g, '');
            return `<svg${rest} width="${(ar >= 1 ? px : px * ar).toFixed(1)}" height="${(ar >= 1 ? px / ar : px).toFixed(1)}">`;
          });
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
        })
    )
  ).then((list) => list.filter(Boolean));
}
