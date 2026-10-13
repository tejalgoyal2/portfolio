import { useEffect, useRef } from 'react';
import { SKILL_NODES } from '../data/skills';
import KineticHeadline from '../press/KineticHeadline';
import { startTornado } from '../life/tornado';
import { afterPrint } from '../life/idle';

/**
 * Skills — a typographic index, readable by construction. Each category is a
 * small-caps label over a wrapping set of type slugs; the whole thing is static
 * (no physics, no canvas), so nothing ever piles into a heap. One restrained
 * signature: hover a slug and it inks — the slug stamps to dark, its neighbours
 * step back — the "pick a slug" feeling, in pure CSS. The slugs are delivered
 * by a tornado: wind and leaves across the empty case, then the funnel sweeps
 * through and drops every slug in its slot (src/life/tornado.js). Reduced
 * motion is the identical, still layout.
 */
export default function Skills() {
  const ref = useRef(null);
  useEffect(() => afterPrint(() => startTornado(ref.current)), []);

  return (
    <section ref={ref} className="skills" aria-label="Skills" data-ground="paper" data-section="skills">
      <div className="press-container">
        <header className="skills-head" data-depart="lift">
          <span className="kicker">Skills</span>
          <KineticHeadline as="h2" font="impact" className="skills-headline">
            What I build with
          </KineticHeadline>
          <p className="skills-instruct" data-ink>
            A working set — security, ML, and the web stack I ship on.
          </p>
        </header>

        <div className="skill-index">
          {SKILL_NODES.map((cat) => (
            <div className="skill-cat" key={cat.id}>
              <h3 className="skill-cat-label" data-arrive="paste">{cat.label}</h3>
              <ul className="skill-list">
                {cat.items.map((item) => (
                  <li className="skill" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
