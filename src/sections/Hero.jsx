import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import KineticHeadline from '../press/KineticHeadline';
import Nameplate from '../press/Nameplate';
import Thinking from '../press/Thinking';

/**
 * The opening — a clean editorial nameplate over a two-column lead: the story
 * on the left, and on the right an empty slot the cube lives in (the WebGL
 * stage reads its box via data-cube-home). The name sets on mount (behind the
 * loader sheet, so it's seated when the sheet feeds up); the lead line, deck
 * and byline wait for `press:loaded` so the page sets itself the instant the
 * press finishes printing.
 */
export default function Hero() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let detach;

    const ctx = gsap.context(() => {
      // nameplate: when the press runs, the loader's own plate flies in to
      // become it (src/press/Loader.jsx); otherwise it's inked in on mount
      if (reduced || !sessionStorage.getItem('press-loaded')) {
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
          // the deck is printed from the start (under the loader's sheet, it's the
          // page's first real paint); it only settles into place as the sheet lifts
          .fromTo('.mast-deck', { y: 14 }, { y: 0, duration: 0.6, ease: 'power2.out' }, 0.1)
          .fromTo(
            '.mast-byline-row, .mast-cue',
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out' },
            0.22
          );
      } else {
        intro.set('.mast-meta, .mast-deck, .mast-byline-row, .mast-cue', { opacity: 1, y: 0 });
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
    <section ref={rootRef} className="hero" aria-label="Intro" data-ground="paper" data-section="hero">
      <div className="press-container">
        {/* nameplate */}
        <div className="mast-band">
          <div className="mast-rule mast-rule--thick" aria-hidden="true" />
          <div className="mast-kickrow">
            <span className="mast-kicker">Software Engineer</span>
            <span className="mast-kicker mast-meta">
              <Thinking />
            </span>
          </div>
          <div className="mast-rule" aria-hidden="true" />

          <h1 className="mast-plate" aria-label="Tejal Goyal">
            <Nameplate text="TEJAL GOYAL" />
          </h1>

          <div className="mast-rule mast-rule--thick" aria-hidden="true" />
        </div>

        {/* lead */}
        <div className="mast-lead">
          <div className="mast-copy">
            <KineticHeadline as="h2" font="impact" misregister intro className="mast-headline">
              BUILDING SOFTWARE THAT FEELS OBVIOUS
            </KineticHeadline>

            <p className="mast-deck">
              I&rsquo;m Tejal — a software engineer who turns new ideas into
              products: AI agents, data pipelines, and things that are fun to
              use. Right now I&rsquo;m connecting AI agents to BCI&rsquo;s
              financial systems.
            </p>
            <div className="mast-byline-row">
              <p className="mast-byline">Software · AI · Data</p>
            </div>
          </div>

          {/* the cube's home on the front page — the stage draws into this box */}
          <div className="mast-cube" data-cube-home="hero" aria-hidden="true" />
        </div>

        <div className="mast-cue" aria-hidden="true">
          ↓ SCROLL ON
        </div>
      </div>
    </section>
  );
}
