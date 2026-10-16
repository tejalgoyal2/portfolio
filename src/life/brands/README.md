# Brand marks

The logos of tools and companies, used where the page talks about them
(the skills' pop-out icons, the tornado's debris, the contact links).

- **Source:** [thesvg](https://github.com/glincker/thesvg), npm package
  `@thesvg/icons` **3.3.9**, MIT (see `LICENSE`). The marks belong to their
  owners; they're here only to show the tools I use.
- **Files:** one `<slug>.svg` per mark, copied verbatim from the package's
  `dist/<slug>.js` (`export const svg`), XML prolog and comments stripped.
  Full colour, as published.
- **`manifest.json`:** slug → `{ title, hex }` from the same files.
- **Loading:** `src/life/brands.js` imports them lazily (one small chunk) and
  can rasterise them for canvases, in colour or as a flat ink silhouette.
- **Which skill uses which mark:** `src/data/skillIcons.js`.

## Adding one

1. `npm pack @thesvg/icons@3.3.9` into a scratch folder and untar it.
2. Find the slug: `ls package/dist | grep -i <name>` (e.g. Azure DevOps is
   `azure-azure-devops`).
3. Copy the string in `export const svg = \`…\`` into `src/life/brands/<slug>.svg`
   (drop the `<?xml …?>` line), and add `{ title, hex }` to `manifest.json`.
4. Point the skill at it in `src/data/skillIcons.js`.

Generic, non-brand icons (a shield, a chart…) come from the hand-drawn set in
`src/life/icons` instead (matita.dev, MIT — see that folder's `LICENSE`).
