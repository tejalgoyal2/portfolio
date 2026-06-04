import { useEffect, useRef, useState } from 'react';
import KineticHeadline from '../press/KineticHeadline';
import Stamp from '../press/Stamp';

/**
 * Stop The Press — the back-page finale. Red floods the whole spread;
 * classified CTAs read like a news-desk docket; the "— 30 —" end mark
 * closes the run (journalist's signal: story is complete).
 *
 * Reveal is pure progressive enhancement with ZERO ScrollTrigger dependency:
 * the content is fully visible by default (no-JS / reduced-motion). Only when
 * JS runs with motion allowed do we add `contact--anim` (which hides the blocks
 * in CSS) and let an IntersectionObserver add `is-in` to stagger them back in.
 * If anything misbehaves, the worst case is the entrance not playing — the page
 * can never be a blank red screen again. The headline uses KineticHeadline's
 * `inview` mode for the same reason (its own ScrollTrigger could strand the
 * glyphs at opacity 0 on this terminal section).
 */
export default function Contact() {
  const rootRef = useRef(null);
  const [decoded, setDecoded] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    // Opt into the hidden→reveal choreography only now that we know JS + motion
    // are available. The press plate settling onto the paper.
    root.classList.add('contact--anim');

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          root.classList.add('is-in');
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(root);

    return () => io.disconnect();
  }, []);

  return (
    <section ref={rootRef} className="contact" id="contact">
      <div className="contact-inner">
        <header className="contact-hd">
          <p className="contact-kicker">BACK PAGE &middot; FINAL EDITION</p>
          <KineticHeadline
            as="h2"
            font="impact"
            className="contact-title"
            spread={false}
            inview
          >
            STOP THE PRESS
          </KineticHeadline>
          <p className="contact-sub">
            Got a story worth running? Let&apos;s talk.
          </p>
        </header>

        <div className="contact-body">
          <div className="contact-stamp-row">
            <Stamp label="APPROVED" tone="ink" rotate={-6} interactive />
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
          <div className="contact-cryptogram">
            <span
              className="cryptogram-text"
              aria-label={decoded ? 'Print is not dead' : 'Encoded message'}
              title={decoded ? undefined : 'ROT13 — try the button'}
            >
              {decoded ? 'PRINT IS NOT DEAD' : 'CEVAG VF ABG QRNQ'}
            </span>
            <button
              className="cryptogram-toggle"
              type="button"
              onClick={() => setDecoded((d) => !d)}
              aria-label={decoded ? 'Re-encode' : 'Decode hidden message'}
            >
              {decoded ? '↩' : 'DECODE'}
            </button>
          </div>
          <p className="contact-end">— 30 —</p>
        </footer>
      </div>
    </section>
  );
}
