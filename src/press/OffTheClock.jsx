/**
 * Off the clock, as the Weekend Edition: a small boxed insert under the
 * Profile with its own little masthead, the things I do away from a keyboard
 * filed under the paper's sections the way a weekend supplement would run
 * them. Plain type, set with care; nothing to click.
 */
const DESKS = [
  { desk: 'Sports', lead: 'F1, every race weekend.', more: 'State-level badminton, once. Finished the TC10K, slowly.' },
  { desk: 'Puzzles', lead: 'Speedcubes. Hence the cube.', more: 'Card tricks, on request.' },
  { desk: 'Kitchen', lead: 'Will bake you a loaf.', more: 'Ask nicely.' },
  { desk: 'Community', lead: '1,000+ trees in the ground.', more: 'From the NGO I co-founded with my brother.' },
];

export default function OffTheClock() {
  return (
    <section className="weekend" aria-labelledby="weekend-title">
      <header className="weekend-mast">
        <span className="weekend-meta">Off the clock</span>
        <h3 className="weekend-title" id="weekend-title">
          The Weekend Edition
        </h3>
        <span className="weekend-meta weekend-meta--end">Price: one loaf</span>
      </header>
      <div className="weekend-desks">
        {DESKS.map(({ desk, lead, more }) => (
          <article className="weekend-desk" key={desk}>
            <p className="weekend-flag">{desk}</p>
            <p className="weekend-lead">{lead}</p>
            <p className="weekend-more">{more}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
