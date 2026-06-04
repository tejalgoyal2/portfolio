/**
 * The paper running through the press — one fixed cream layer with a faint
 * grain. The dark spreads (Experience, Blog) and the red finale (Contact) each
 * own their own background, so legibility never depends on a scrubbed layer;
 * the gradient ink-seam between the cream and ink halves sells the transition.
 * Static, GPU-free, reflow-proof.
 */
export default function PaperBackdrop() {
  return (
    <div className="paper-backdrop" aria-hidden="true">
      <div className="paper-grain" />
    </div>
  );
}
