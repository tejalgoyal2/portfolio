import { useEffect, useRef } from 'react';
import KineticHeadline from '../press/KineticHeadline';
import Postage from '../press/Postage';
import RoadCar from '../press/RoadCar';
import LettersCorner from '../press/LettersCorner';
// the marks themselves (src/life/brands, from thesvg — see its README.md), as plain asset URLs
import gmailIcon from '../life/brands/gmail.svg?url';
import githubIcon from '../life/brands/github.svg?url';
import linkedinIcon from '../life/brands/linkedin.svg?url';

/**
 * Let's talk — the oxblood finale, where the cube comes back out of the margin
 * to finish its solve in front of you. Reveal is pure progressive enhancement with
 * zero ScrollTrigger dependency: the content is fully visible by default (no-JS
 * / reduced-motion). Only when JS runs with motion allowed do we add
 * `contact--anim` (which hides the blocks in CSS) and let an IntersectionObserver
 * stagger them back in. Worst case is the entrance not playing — never a blank
 * red screen. The headline uses KineticHeadline's `inview` mode for the same
 * reason.
 */
const LINKS = [
  { name: 'Email', href: 'mailto:itejalgoyal@gmail.com', text: 'itejalgoyal@gmail.com', icon: gmailIcon },
  { name: 'GitHub', href: 'https://github.com/tejalgoyal2', text: 'github.com/tejalgoyal2', icon: githubIcon, external: true },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/in/tejalgoyal', text: 'linkedin.com/in/tejalgoyal', icon: linkedinIcon, external: true },
];

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
    <section ref={rootRef} className="contact" id="contact" data-ground="red" data-section="contact">
      {/* the cube comes home here, big, for the last moves of the solve (src/gl/presence.js) */}
      <div className="contact-cube" data-cube-home="contact" aria-hidden="true" />
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
          <p className="contact-sub" data-ink>
            Building something interesting? I&rsquo;d like to hear about it.
          </p>
        </header>

        <div className="contact-body">
          <div className="contact-stamp-row">
            <Postage />
          </div>

          <ul className="contact-classified" data-arrive-items="paste">
            {LINKS.map(({ name, href, text, icon, external }) => (
              <li className="contact-line" key={name}>
                {/* the mark is a way in too (the text link carries the name for screen readers) */}
                <a
                  href={href}
                  className="contact-line-label"
                  tabIndex={-1}
                  aria-hidden="true"
                  data-pen="rocket"
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  <img src={icon} alt="" width="22" height="22" loading="lazy" />
                </a>
                <a
                  href={href}
                  className="contact-line-link"
                  data-pen="rocket"
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  <span className="sr-only">{name}: </span>
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <LettersCorner />

        <footer className="contact-colophon">
          <p className="contact-colophon-text">
            Designed &amp; built by hand in Victoria, BC &middot; Set in Fraunces
            &amp; Newsreader.
          </p>
        </footer>
      </div>
      <RoadCar />
    </section>
  );
}
