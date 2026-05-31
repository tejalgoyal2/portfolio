import { useEffect, useRef } from 'react';
import KineticHeadline from '../press/KineticHeadline';
import Stamp from '../press/Stamp';

/**
 * Let's talk — the warm red finale. Reveal is pure progressive enhancement with
 * zero ScrollTrigger dependency: the content is fully visible by default (no-JS
 * / reduced-motion). Only when JS runs with motion allowed do we add
 * `contact--anim` (which hides the blocks in CSS) and let an IntersectionObserver
 * stagger them back in. Worst case is the entrance not playing — never a blank
 * red screen. The headline uses KineticHeadline's `inview` mode for the same
 * reason.
 */
export default function Contact() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

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
          <p className="contact-kicker">Get in touch</p>
          <KineticHeadline
            as="h2"
            font="impact"
            className="contact-title"
            spread={false}
            inview
          >
            LET&rsquo;S TALK
          </KineticHeadline>
          <p className="contact-sub">
            Building something interesting? I&rsquo;d like to hear about it.
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
            Designed &amp; built by hand in Victoria, BC &middot; Set in Fraunces
            &amp; Newsreader.
          </p>
        </footer>
      </div>
    </section>
  );
}
