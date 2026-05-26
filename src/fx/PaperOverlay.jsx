/**
 * Two fixed full-viewport overlays that give the site its "printed comic book"
 * surface. Render once at App root, after SvgFilters.
 */
export default function PaperOverlay() {
  return (
    <>
      <div className="paper-overlay" aria-hidden="true" />
      <div className="halftone-overlay" aria-hidden="true" />
    </>
  );
}
