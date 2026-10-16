// Brand marks of the tools I use — from thesvg (@thesvg/icons 3.3.9, MIT; how
// to add one is in ./brands/README.md) — as raw SVG strings, imported lazily by
// whatever draws them: the skills' pop-out icons, the tornado's debris, the
// contact links. In their own colours, or as a flat ink silhouette.
const files = import.meta.glob('./brands/*.svg', { query: '?raw', import: 'default', eager: true });

/** slug → SVG string */
export const BRAND = Object.fromEntries(Object.entries(files).map(([path, svg]) => [path.split('/').pop().replace('.svg', ''), svg]));

/** A mark as an image URL, for an <img> (each one is its own little document, so ids never clash). */
export const brandURL = (slug) => (BRAND[slug] ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(BRAND[slug])}` : null);

/**
 * Rasterise marks to canvases, longest side `px` — in their own colours, or in
 * one flat `ink` if given. One at a time, yielding between each (drawing an
 * SVG into a canvas is synchronous work), so it never blocks the page.
 * Resolves to [{ name, img, w, h }] (aspect kept).
 */
export async function brandSprites(px, ink = null, only = null) {
  const out = [];
  const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 200 }) : setTimeout(r, 16)));
  for (const [name, svg] of Object.entries(BRAND)) {
    if (only && !only.includes(name)) continue;
    await idle();
    const sprite = await rasterise(name, svg, px, ink);
    if (sprite) out.push(sprite);
  }
  return out;
}

function rasterise(name, svg, px, ink) {
  return new Promise((resolve) => {
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
      if (ink) {
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = ink;
        ctx.fillRect(0, 0, c.width, c.height);
      }
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
  });
}
