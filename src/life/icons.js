// The vendored matita.dev pencil icons (MIT — see ./icons/LICENSE), as raw
// SVG strings. Imported lazily (see ./sprites.js), after the page has printed.
const files = import.meta.glob('./icons/*.svg', { query: '?raw', import: 'default', eager: true });

/** name (file name without .svg) → SVG string */
export const ICON = Object.fromEntries(Object.entries(files).map(([path, svg]) => [path.split('/').pop().replace('.svg', ''), svg]));

export const ICONS = Object.values(ICON);
