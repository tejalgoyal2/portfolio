import { useEffect, useRef } from 'react';
import KineticHeadline from '../press/KineticHeadline';
import Resume from '../press/Resume';
import RoadCar from '../press/RoadCar';
import GratefulFor from '../press/GratefulFor';
// the marks themselves (src/life/brands, from thesvg, MIT — see its LICENSE), as plain asset URLs
import gmailIcon from '../life/brands/gmail.svg?url';
import githubIcon from '../life/brands/github.svg?url';
import linkedinIcon from '../life/brands/linkedin.svg?url';

/**
 * Let's talk — the oxblood finale. The cube comes back out of the margin to
 * finish its solve beside the headline; under the gratitude sheet, the car
 * drives in along the road. Reveal is pure progressive enhancement with
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
      {/* Let's talk and the cube side by side: it finishes its solve here, beside the
          headline, not down at the foot of the page */}
      <div className="contact-lead">
        <div className="contact-inner">
          <header className="contact-hd">
            <p className="contact-kicker">Get in touch</p>
            <KineticHeadline
              as="h2"
              font="impact"
              className="contact-title"
              spread={false}
              inview
              showLoose
            >
              LET&rsquo;S TALK
            </KineticHeadline>
            <p className="contact-sub" data-ink>
              Hiring, building something, or just want to talk F1? All three work.
            </p>
          </header>

          <div className="contact-body">
            {/* where a letter's stamp would go: the resume (public/resume.pdf) */}
            <div className="contact-stamp-row">
              <Resume />
            </div>

            <ul className="contact-classified">
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
        </div>
        <div className="contact-cube" data-cube-home="contact" aria-hidden="true" />
      </div>

      <div className="contact-inner">
        <GratefulFor />

        <footer className="contact-colophon">
          <p className="contact-colophon-text">
            Written, set and occasionally broken by me (and Claude).
          </p>
        </footer>
      </div>
      <RoadCar />
    </section>
  );
}
