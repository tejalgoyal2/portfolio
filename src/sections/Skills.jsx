import { useEffect, useLayoutEffect, useRef } from 'react';
import { SKILL_NODES } from '../data/skills';
import KineticHeadline from '../press/KineticHeadline';
import { startSkillArrive } from '../life/skillArrive';
import { afterPrint } from '../life/idle';

/**
 * Skills — a typographic index, readable by construction. Each category is a
 * small-caps label over a wrapping set of type slugs; the layout itself is
 * static, so nothing ever piles into a heap. The first time it comes into view
 * the skills fly in as their own icons and turn into their slugs; click one
 * later and it shows you its icon for a moment (src/life/skillArrive.js).
 * Reduced motion is the identical, still layout.
 */
export default function Skills() {
  const ref = useRef(null);
  // the slugs wait, unseen, for their icons from the very first paint (not
  // only once the arrival script has started), so the cells never show first
  useLayoutEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) ref.current?.classList.add('skills-await');
  }, []);
  useEffect(
    () =>
      afterPrint(() => startSkillArrive(ref.current)),
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
