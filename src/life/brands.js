// Brand marks of the tools I use — from thesvg (@thesvg/icons 3.3.9, MIT; how
// to add one is in ./brands/README.md). Each mark stays its own small file
// (vite.config.js keeps them out of the scripts), so this is only a list of
// URLs: a mark is downloaded the first time an <img> shows it, and only that one.
const files = import.meta.glob('./brands/*.svg', { query: '?url', import: 'default', eager: true });

/** slug → URL of the mark, for an <img> (each one is its own little document, so ids never clash). */
const URLS = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop().replace('.svg', ''), url]));

export const brandURL = (slug) => URLS[slug] || null;
