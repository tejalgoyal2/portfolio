// The vendored matita.dev pencil icons (MIT — see ./icons/LICENSE), as raw
// SVG strings. Imported lazily (see ./sprites.js), after the page has printed.
const files = import.meta.glob('./icons/*.svg', { query: '?raw', import: 'default', eager: true });

export const ICONS = Object.values(files);
