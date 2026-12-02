import { useEffect, useRef } from 'react';
import KineticHeadline from '../press/KineticHeadline';
import OffTheClock from '../press/OffTheClock';
import { startCar } from '../life/car';
import { afterPrint } from '../life/idle';
import { scroll } from '../life/scroll';
import { onLayout } from '../life/layout';

/**
 * The Profile: who I am in two short paragraphs and a pull quote, and beside
 * them a short rail — a few numbers and what I do off the clock. Calm on
 * purpose: nothing here animates in or out; the headline sets itself like
 * type, and a little car drives the rule under it as you scroll.
 */
export default function About() {
  const rootRef = useRef(null);

  // the pencil and the car, once fonts and layout have settled
  useEffect(
    () =>
      afterPrint(() => {
        const root = rootRef.current;
        if (!root) return;
        let stops = [];
        let cancelled = false;
        const go = async () => {
          await document.fonts?.ready;
          if (cancelled) return;
          const grid = root.querySelector('.about-grid');
          const road = { top: 0, w: 1 };
          const measureRoad = () => {
            road.top = grid.getBoundingClientRect().top + scroll.y;
            road.w = grid.clientWidth - 68;
          };
          measureRoad();
          stops = [
            // the car on the rule: across as the rule climbs the screen
            startCar(grid, {
              pathAt: (x) => ({ x: 34 + x, y: -3, angle: 0 }),
              length: () => road.w,
              target: () => {
                // from the rule's cached place on the page (no measuring per frame)
                const top = road.top - scroll.y;
                const vh = scroll.vh;
                const p = Math.min(1, Math.max(0, (vh * 0.95 - top) / (vh * 0.85)));
                return p * road.w;
              },
            }),
            onLayout(measureRoad),
          ];
        };
        go();
        return () => {
          cancelled = true;
          stops.forEach((f) => f());
        };
      }),
    []
  );

  return (
    <section ref={rootRef} className="about" aria-label="Profile" data-ground="paper" data-section="about">
      <div className="press-container">
        <header className="about-head">
          <span className="kicker">Profile</span>
          <KineticHeadline as="h2" font="name" className="about-headline">
            I build the version that just works
          </KineticHeadline>
        </header>

        <div className="about-grid">
          <div className="about-col about-col--story">
            <p className="about-p about-p--lead">
              I&rsquo;m Tejal. I build software that feels obvious: AI agents that
              talk to real systems, data pipelines that hold up, and small things
              that are fun to use.
            </p>
            <p className="about-p">
              I started in electronics engineering, scaled federated-learning
              experiments from fifty simulated clients to a million, and spent a
              winter on a security desk. Weekends, I ship my own: type, Dime, a
              Sudoku with no ads.
            </p>
            <blockquote className="about-pq">&ldquo;The best software feels obvious. Getting it there never is.&rdquo;</blockquote>
          </div>

          <aside className="about-col about-col--rail" aria-label="By the numbers">
            <dl className="about-stats">
              <div className="about-stat">
                <dt>MEng GPA</dt>
                <dd>8.82 / 9.0</dd>
              </div>
              <div className="about-stat">
                <dt>GRE — Quant</dt>
                <dd>167 / 170</dd>
              </div>
              <div className="about-stat">
                <dt>Side projects live</dt>
                <dd>
                  <span className="about-red">5</span> and counting
                </dd>
              </div>
              <div className="about-stat">
                <dt>Claude Pro since</dt>
                <dd>Feb 2026</dd>
              </div>
            </dl>
            <OffTheClock />
          </aside>
        </div>
      </div>
    </section>
  );
}
