import Hand from './Hand';
import { bus } from '../life/bus';

/**
 * Off the clock — jotted along the foot of the Profile by the pencil
 * (src/life/writeIn.js), in a natural hand: each note its own slope and a
 * slightly different height, the way you'd scribble things across a margin
 * over a few days. The speedcubing one does what it says: point the pencil at
 * it and the cube in the margin does a quick R U R' U' (your twists, so it
 * undoes them itself once you scroll on).
 */
const NOTES = [
  { t: 'F1 on weekends.' },
  { t: 'Speedcubes (hence the cube).', cube: true },
  { t: 'Card tricks, on request.' },
  { t: 'Co-founded an NGO with my brother — 1,000+ trees in.' },
  { t: 'State-level badminton, once.' },
  { t: 'Finished the TC10K (slowly).' },
  { t: 'Will bake you a loaf.' },
];
// a little up or down, the way a hand drifts along a line
const LIFT = [0, 0.5, -0.2, 0.35, -0.3, 0.6, 0.1];

const trigger = () => {
  // a speedcuber's trigger, on the cube in the margin
  ['R', 'U'].forEach((f) => bus.twist?.(f));
  ['R', 'U'].forEach((f) => bus.twist?.(f, true));
};

export default function OffTheClock() {
  return (
    <div className="about-otc">
      <p className="about-otc-kicker">Off the clock</p>
      <ul className="about-margin" aria-label="Off the clock">
        {NOTES.map((n, i) => (
          <li key={n.t} style={{ '--lift': `${LIFT[i % LIFT.length]}rem` }}>
            {n.cube ? (
              <button type="button" className="otc-act" aria-label={`${n.t} Make the cube do a quick trigger.`} onClick={trigger}>
                <Hand className="otc-note">{n.t}</Hand>
              </button>
            ) : (
              <Hand className="otc-note">{n.t}</Hand>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
