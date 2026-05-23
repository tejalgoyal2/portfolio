import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import KineticHeadline from '../press/KineticHeadline';

/**
 * The Front Page — masthead. A real broadsheet nameplate band (kicker + live
 * status strip flanking the title TEJAL GOYAL), an edition line, then the lead
 * story set in movable type. The focal object IS the type — no 3D.
 *
 * Choreography: the nameplate sets on mount (behind the loader sheet, so it's
 * seated when the sheet feeds up). Everything else — lead headline, status
 * ticker, byline/deck/cue — waits for `press:loaded` so the page sets itself
 * the instant the press finishes printing.
 */
const STATUS = 'TODAY — shipping MCP servers @ BCI · partly cloudy, compiling';

export default function Hero() {
  const rootRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let detach;
    let typer;

    const typeStatus = () => {
      const el = statusRef.current;
      if (!el) return;
      if (reduced) {
        el.textContent = STATUS;
        return;
      }
      let i = 0;
      const step = () => {
        el.textContent = STATUS.slice(0, i);
        if (i++ <= STATUS.length) typer = setTimeout(step, 22);
      };
      step();
    };

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
            '.mast-byline, .mast-deck, .mast-cue',
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out' },
            0.1
          );
      } else {
        intro.set('.mast-meta, .mast-byline, .mast-deck, .mast-cue', { opacity: 1, y: 0 });
      }

      const play = () => {
        typeStatus();
        intro.play(0);
      };
      if (sessionStorage.getItem('press-loaded')) play();
      else {
        window.addEventListener('press:loaded', play, { once: true });
        detach = () => window.removeEventListener('press:loaded', play);
      }
    }, root);

    return () => {
      detach?.();
      clearTimeout(typer);
      ctx.revert();
    };
  }, []);

  return (
    <section ref={rootRef} className="hero" aria-label="Front page">
      <div className="press-container">
        {/* nameplate band */}
        <div className="mast-band">
          <div className="mast-rule mast-rule--thick" aria-hidden="true" />
          <div className="mast-kickrow">
            <span className="mast-kicker">THE PERSONAL PRESS</span>
            <span className="mast-status mast-meta">
              <span className="mast-status-label">WIRE</span>
              <span ref={statusRef} className="mast-status-text" aria-label={STATUS} />
            </span>
          </div>
          <div className="mast-rule" aria-hidden="true" />

          <h1 className="mast-plate" aria-label="Tejal Goyal">TEJAL GOYAL</h1>

          <div className="mast-rule" aria-hidden="true" />
          <div className="mast-edition mast-meta">
            <span>VOL.&nbsp;I · NO.&nbsp;1</span>
            <span>VICTORIA, BC · EST.&nbsp;2017</span>
            <span>PRICE: YOUR ATTENTION</span>
          </div>
          <div className="mast-rule mast-rule--thick" aria-hidden="true" />
        </div>

        {/* lead story */}
        <div className="mast-lead">
          <KineticHeadline as="h2" font="impact" misregister intro className="mast-headline">
            BREAKING THINGS TO BUILD BETTER ONES
          </KineticHeadline>

          <p className="mast-byline">by Tejal Goyal — software · security · ml</p>
          <p className="mast-deck">
            Software engineer who came up through machine-learning research and a
            cybersecurity desk. Currently building MCP servers and AI agents at BCI.
          </p>
        </div>

        <div className="mast-cue" aria-hidden="true">
          ↓ CONTINUED ON EVERY PAGE BELOW
        </div>
      </div>
    </section>
  );
}
