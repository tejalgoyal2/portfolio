import { SKILL_NODES } from '../data/skills';
import KineticHeadline from '../press/KineticHeadline';

/**
 * Skills — a typographic index, readable by construction. Each category is a
 * small-caps label over a wrapping set of type slugs; the whole thing is static
 * (no physics, no canvas), so nothing ever piles into a heap. One restrained
 * signature: hover a slug and it inks — the slug stamps to dark, its neighbours
 * step back — the "pick a slug" feeling, in pure CSS. As you scroll, each row
 * is set into the stick sort by sort, and pied (spilled) on the way out
 * (src/life/arrive.js). Reduced motion is the identical, still layout.
 */
export default function Skills() {
  return (
    <section className="skills" aria-label="Skills" data-ground="paper" data-section="skills">
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
              <ul className="skill-list" data-arrive-items="set" data-depart-items="pi">
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
