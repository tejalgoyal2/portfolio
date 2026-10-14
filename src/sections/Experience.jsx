import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { EXPERIENCE } from '../data/experience';
import KineticHeadline from '../press/KineticHeadline';
import Redacted from '../press/Redacted';
import CountUp from '../press/CountUp';

/**
 * Experience — the working history on the first dark spread. The section owns
 * its ink background, so the bright text is legible no matter where the scroll
 * sits (no scrubbed layer to desync). Every entry shows in full — role, place,
 * and what I actually did — so there's no hover-expand to reflow the page. One
 * security line stays redacted until you scroll it into the clear. Entrance
 * staggers in once; reduced motion just reads it static.
 *
 * As you scroll the ledger, a red rule draws itself down the left margin
 * (scaleY, scrubbed) with a pen nib riding its tip, pressing a dot into the
 * margin as it reaches each job; each row is pasted in from the margin and slides off the
 * galley on the way out (src/life/arrive.js), and the headline numbers —
 * marked {{like this}} in the data — count up as they arrive.
 */
const REDACT = 'C2';

function Plain({ text }) {
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

function Dispatch({ text }) {
  return text.split(/(\{\{.+?\}\})/).map((part, k) =>
    part.startsWith('{{') ? <CountUp key={k} value={part.slice(2, -2)} /> : <Plain key={k} text={part} />
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
      const ledger = root.querySelector('.ledger');
      const nib = root.querySelector('.led-nib');
      const dots = [...root.querySelectorAll('.led-dot-mark')];
      gsap.fromTo(
        '.led-rule',
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: ledger,
            start: 'top 70%',
            end: 'bottom 70%',
            scrub: 0.5,
            onUpdate: (self) => {
              // the nib rides the tip; each job's dot is pressed in as the line reaches it
              const y = self.progress * ledger.offsetHeight;
              nib.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
              nib.classList.toggle('is-on', self.progress > 0.002 && self.progress < 0.998);
              for (const d of dots) d.classList.toggle('is-in', y >= d.parentElement.offsetTop + 14);
            },
          },
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="experience" id="experience" aria-label="Experience" data-ground="ink" data-section="experience">
      <div className="press-container">
        <header className="led-head" data-depart="lift">
          <span className="kicker">Experience</span>
          <KineticHeadline as="h2" font="name" className="led-headline">
            Where I&rsquo;ve worked
          </KineticHeadline>
        </header>

        <div className="ledger">
          <span className="led-rule" aria-hidden="true" />
          <span className="led-nib" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 22 6.5 12.5 9 4h6l2.5 8.5z" />
              <circle cx="12" cy="11.5" r="1.4" />
              <path d="M12 13v8" />
            </svg>
          </span>
          {EXPERIENCE.map((entry) => (
            <article
              key={`${entry.org}-${entry.period}`}
              className={`led-entry${reduced ? ' is-open' : ''}`}
              data-arrive="paste"
              data-depart="slide"
            >
              <span className="led-dot-mark" aria-hidden="true" />
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
                <p className="led-desc" data-ink>{entry.desc}</p>

                {entry.details?.length > 0 && (
                  <ul className="led-dispatches">
                    {entry.details.map((d, j) => (
                      <li className="led-dispatch" key={j} data-ink="block">
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
