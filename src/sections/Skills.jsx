import { useEffect, useRef } from 'react';
import { SKILL_NODES } from '../data/skills';
import KineticHeadline from '../press/KineticHeadline';
import { startTornado } from '../life/tornado';
import { startSkillPops } from '../life/skillPop';
import { afterPrint } from '../life/idle';

/**
 * Skills — a typographic index, readable by construction. Each category is a
 * small-caps label over a wrapping set of type slugs; the layout itself is
 * static, so nothing ever piles into a heap. Every slug has an icon inside:
 * point at one and it peeks up, click and it pops out and floats away
 * (src/life/skillPop.js). The slugs are delivered
 * by a tornado: wind and leaves across the empty case, then the funnel sweeps
 * through and drops every slug in its slot (src/life/tornado.js). Reduced
 * motion is the identical, still layout.
 */
export default function Skills() {
  const ref = useRef(null);
  useEffect(
    () =>
      afterPrint(() => {
        const stopTornado = startTornado(ref.current);
        const stopPops = startSkillPops(ref.current);
        return () => {
          stopTornado();
          stopPops();
        };
      }),
    []
  );

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
