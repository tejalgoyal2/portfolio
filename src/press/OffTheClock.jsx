/**
 * Off the clock — the things I do when I'm not at a keyboard, set as a short
 * list in the Profile's rail. Plain type, no tricks: it's there to read.
 */
const NOTES = [
  'F1 on weekends.',
  'Speedcubes (hence the cube).',
  'Card tricks, on request.',
  'Co-founded an NGO with my brother — 1,000+ trees in.',
  'State-level badminton, once.',
  'Finished the TC10K (slowly).',
  'Will bake you a loaf.',
];

export default function OffTheClock() {
  return (
    <div className="about-otc">
      <p className="about-otc-kicker">Off the clock</p>
      <ul className="about-margin">
        {NOTES.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
