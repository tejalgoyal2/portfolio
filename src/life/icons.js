// The vendored matita.dev pencil icons (MIT — see ./icons/LICENSE), as raw
// SVG strings. Imported lazily by the icon rain, so they cost nothing until
// someone presses the stamp.
const files = import.meta.glob('./icons/*.svg', { query: '?raw', import: 'default', eager: true });

export const ICONS = Object.values(files);
