import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { EXPERIENCE } from '../data/experience';
import KineticHeadline from '../press/KineticHeadline';
import Redacted from '../press/Redacted';

/**
 * Experience — the working history on the first dark spread. The section owns
 * its ink background, so the bright text is legible no matter where the scroll
 * sits (no scrubbed layer to desync). Every entry shows in full — role, place,
 * and what I actually did — so there's no hover-expand to reflow the page. One
 * security line stays redacted until you scroll it into the clear. Entrance
 * staggers in once; reduced motion just reads it static.
 */
const REDACT = 'C2';

function Dispatch({ text }) {
  const i = text.indexOf(`${REDACT} indicators`);
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <Redacted trigger="scroll" tone="red">
        {REDACT}
      </Redacted>
      {text.slice(i + REDACT.length)}
    </>
  );
}

export default function Experience() {
  const rootRef = useRef(null);
  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const root = rootRef.current;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return;

    const ctx = gsap.context(() => {
      gsap.from('.led-entry', {
        y: 36,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.ledger', start: 'top 78%', once: true },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="experience" id="experience" aria-label="Experience">
      <div className="press-container">
        <header className="led-head">
          <span className="kicker">Experience</span>
          <KineticHeadline as="h2" font="name" className="led-headline">
            Where I&rsquo;ve worked
          </KineticHeadline>
        </header>

        <div className="ledger">
          {EXPERIENCE.map((entry) => (
            <article
              key={`${entry.org}-${entry.period}`}
              className={`led-entry${reduced ? ' is-open' : ''}`}
            >
              <div className="led-period">{entry.period}</div>

              <div className="led-body">
                <h3 className="led-role">
                  {entry.role}
                  {entry.active && (
                    <span className="led-developing">
                      <span className="led-dot" aria-hidden="true" />— Now
                    </span>
                  )}
                </h3>
                <p className="led-org">{entry.org}</p>
                <p className="led-desc">{entry.desc}</p>

                {entry.details?.length > 0 && (
                  <ul className="led-dispatches">
                    {entry.details.map((d, j) => (
                      <li className="led-dispatch" key={j}>
                        <Dispatch text={d} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
