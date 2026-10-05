/**
 * One printed sheet on the pile (see src/life/sheets.js). `ground` is the stock
 * it's printed on; a `torn` sheet starts with a torn deckle edge (its Seam), so
 * it shows the sheet beneath through the tear instead of casting a straight
 * shadow. `label` is what the section label and the menu call it.
 */
export default function Sheet({ ground = 'paper', torn = false, label, z, children }) {
  return (
    <div
      className={`sheet sheet--${ground}${torn ? ' sheet--torn' : ''}`}
      data-sheet-label={label}
      style={{ '--z': z }}
    >
      {children}
    </div>
  );
}
