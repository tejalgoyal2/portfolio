import { SKILL_NODES } from '../data/skills';
import KineticHeadline from '../press/KineticHeadline';

/**
 * Skills — a typographic index, readable by construction. Each category is a
 * small-caps label over a wrapping set of type slugs; the whole thing is static
 * (no physics, no canvas), so nothing ever piles into a heap. One restrained
 * signature: hover a slug and it inks — the slug stamps to dark, its neighbours
 * step back — the "pick a slug" feeling, in pure CSS. Reduced motion is the
 * identical layout (the lift is the only thing it drops).
 */
export default function Skills() {
  return (
    <section className="skills" aria-label="Skills">
      <div className="press-container">
        <header className="skills-head">
          <span className="kicker">Skills</span>
          <KineticHeadline as="h2" font="impact" className="skills-headline">
            What I build with
          </KineticHeadline>
          <p className="skills-instruct">
            A working set — security, ML, and the web stack I ship on.
          </p>
        </header>

        <div className="skill-index">
          {SKILL_NODES.map((cat) => (
            <div className="skill-cat" key={cat.id}>
              <h3 className="skill-cat-label">{cat.label}</h3>
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
