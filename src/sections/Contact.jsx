import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import KineticHeadline from '../press/KineticHeadline';
import Stamp from '../press/Stamp';

/**
 * Stop The Press — the back-page finale. Red floods the whole spread;
 * classified CTAs read like a news-desk docket; the "— 30 —" end mark
 * closes the run (journalist's signal: story is complete).
 */
export default function Contact() {
  const innerRef = useRef(null);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    // Content enters from below as the section comes into view —
    // the press plate slamming down onto the paper.
    const tl = gsap.timeline({
      scrollTrigger: { trigger: inner, start: 'top 88%', once: true },
    });
    tl.from(inner, { y: 48, opacity: 0, duration: 0.9, ease: 'power3.out' });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <section className="contact" id="contact">
      <div ref={innerRef} className="contact-inner">
        <header className="contact-hd">
          <p className="contact-kicker">BACK PAGE &middot; FINAL EDITION</p>
          <KineticHeadline
            as="h2"
            font="impact"
            className="contact-title"
            spread={false}
          >
            STOP THE PRESS
          </KineticHeadline>
          <p className="contact-sub">
            Got a story worth running? Let&apos;s talk.
          </p>
        </header>

        <div className="contact-body">
          <div className="contact-stamp-row">
            <Stamp label="APPROVED" tone="ink" rotate={-6} pressIn />
          </div>

          <ul className="contact-classified">
            <li className="contact-line">
              <span className="contact-line-label">EMAIL&nbsp;→</span>
              <a
                href="mailto:itejalgoyal@gmail.com"
                className="contact-line-link"
              >
                itejalgoyal@gmail.com
              </a>
            </li>
            <li className="contact-line">
              <span className="contact-line-label">GITHUB&nbsp;→</span>
              <a
                href="https://github.com/tejalgoyal2"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-line-link"
              >
                github.com/tejalgoyal2
              </a>
            </li>
            <li className="contact-line">
              <span className="contact-line-label">LINKEDIN&nbsp;→</span>
              <a
                href="https://www.linkedin.com/in/tejalgoyal"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-line-link"
              >
                in/tejalgoyal
              </a>
            </li>
          </ul>
        </div>

        <footer className="contact-colophon">
          <p className="contact-colophon-text">
            THE PERSONAL PRESS &middot; Printed in Victoria, BC &middot; Set
            in Fraunces &amp; Newsreader &middot; Built by hand.
          </p>
          <p className="contact-end">— 30 —</p>
        </footer>
      </div>
    </section>
  );
}
