import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { EXPERIENCE } from '../data/experience';
import KineticHeadline from '../press/KineticHeadline';
import Redacted from '../press/Redacted';

/**
 * On the Record — the working history kept as a running ledger on the first
 * ink spread. The red thread runs behind it as the spine; a hairline rule draws
 * down beside the entries on scroll. Each entry opens its filed dispatches on a
 * deliberate dwell (hold the hover ~450ms — explicit, never on a scroll-by),
 * and one security line stays redacted until you scroll it into the clear.
 * Reduced motion → dispatches read open, no dwell, no draw.
 */
const DWELL_MS = 450;
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
  const spineRef = useRef(null);
  const timerRef = useRef(0);
  const reducedRef = useRef(false);
  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    reducedRef.current = reduced;

    const ctx = gsap.context(() => {
      if (reduced) return;

      gsap.from('.led-entry', {
        y: 36,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.ledger', start: 'top 74%', once: true },
      });

      gsap.fromTo(
        spineRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: '.ledger', start: 'top 80%', end: 'bottom 70%', scrub: true },
        }
      );
    }, root);

    return () => {
      clearTimeout(timerRef.current);
      ctx.revert();
    };
  }, []);

  const enter = (i) => {
    if (reducedRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(i), DWELL_MS);
  };
  const leave = () => {
    if (reducedRef.current) return;
    clearTimeout(timerRef.current);
    setOpen(null);
  };

  return (
    <section ref={rootRef} className="experience" id="experience" data-ground="ink" aria-label="On the record — experience">
      <div className="press-container">
        <header className="led-head">
          <span className="kicker">On the Record</span>
          <KineticHeadline as="h2" font="name" className="led-headline">
            The working history
          </KineticHeadline>
        </header>

        <div className="ledger">
          <span ref={spineRef} className="led-spine" aria-hidden="true" />

          {EXPERIENCE.map((entry, i) => {
            const isOpen = open === i || reduced;
            return (
              <article
                key={`${entry.org}-${entry.period}`}
                className={`led-entry${isOpen ? ' is-open' : ''}`}
                onPointerEnter={() => enter(i)}
                onPointerLeave={leave}
              >
                <div className="led-period">{entry.period}</div>

                <div className="led-body">
                  <h3 className="led-role">
                    {entry.role}
                    {entry.active && (
                      <span className="led-developing">
                        <span className="led-dot" aria-hidden="true" />— Developing story
                      </span>
                    )}
                  </h3>
                  <p className="led-org">{entry.org}</p>
                  <p className="led-desc">{entry.desc}</p>

                  {entry.details?.length > 0 && (
                    <>
                      <div className="led-expand">
                        <ul className="led-dispatches">
                          {entry.details.map((d, j) => (
                            <li className="led-dispatch" key={j}>
                              <Dispatch text={d} />
                            </li>
                          ))}
                        </ul>
                      </div>
                      <span className="led-cue" aria-hidden="true">
                        {isOpen ? 'Filed dispatches' : 'Dwell to open the file'}
                      </span>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
