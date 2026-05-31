import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import KineticHeadline from '../press/KineticHeadline';

/**
 * The opening — a clean editorial nameplate. The name sets on mount (behind the
 * loader sheet, so it's seated when the sheet feeds up); the lead line, deck and
 * role tag wait for `press:loaded` so the page sets itself the instant the press
 * finishes printing. First person, no masthead props — just type.
 */
export default function Hero() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let detach;

    const ctx = gsap.context(() => {
      // nameplate sets on mount — seated by the time the loader lifts
      if (reduced) {
        gsap.set('.mast-plate', { clipPath: 'inset(0)', opacity: 1 });
      } else {
        gsap.fromTo(
          '.mast-plate',
          { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
          { clipPath: 'inset(0 0% 0 0)', duration: 0.85, ease: 'power3.out', delay: 0.1 }
        );
      }

      // intro choreography — paused until the press finishes printing
      const intro = gsap.timeline({ paused: true });
      if (!reduced) {
        intro
          .fromTo('.mast-meta', { opacity: 0 }, { opacity: 1, duration: 0.4 })
          .fromTo(
            '.mast-deck, .mast-byline, .mast-cue',
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out' },
            0.1
          );
      } else {
        intro.set('.mast-meta, .mast-deck, .mast-byline, .mast-cue', { opacity: 1, y: 0 });
      }

      if (sessionStorage.getItem('press-loaded')) intro.play(0);
      else {
        const play = () => intro.play(0);
        window.addEventListener('press:loaded', play, { once: true });
        detach = () => window.removeEventListener('press:loaded', play);
      }
    }, root);

    return () => {
      detach?.();
      ctx.revert();
    };
  }, []);

  return (
    <section ref={rootRef} className="hero" aria-label="Intro">
      <div className="press-container">
        {/* nameplate */}
        <div className="mast-band">
          <div className="mast-rule mast-rule--thick" aria-hidden="true" />
          <div className="mast-kickrow">
            <span className="mast-kicker">Software Engineer</span>
            <span className="mast-kicker mast-meta">Victoria, BC</span>
          </div>
          <div className="mast-rule" aria-hidden="true" />

          <h1 className="mast-plate" aria-label="Tejal Goyal">TEJAL GOYAL</h1>

          <div className="mast-rule mast-rule--thick" aria-hidden="true" />
        </div>

        {/* lead */}
        <div className="mast-lead">
          <KineticHeadline as="h2" font="impact" misregister intro className="mast-headline">
            BREAKING THINGS TO BUILD BETTER ONES
          </KineticHeadline>

          <p className="mast-deck">
            I&rsquo;m Tejal — a software engineer who came up through
            machine-learning research and a cybersecurity desk. Now I build and
            modernize the enterprise financial systems BCI&rsquo;s investment
            teams run on.
          </p>
          <p className="mast-byline">Software · Security · ML</p>
        </div>

        <div className="mast-cue" aria-hidden="true">
          ↓ SCROLL ON
        </div>
      </div>
    </section>
  );
}
