import { useEffect, useRef } from 'react';
import KineticHeadline from '../press/KineticHeadline';
import OffTheClock from '../press/OffTheClock';
import CountUp from '../press/CountUp';
import { startCar } from '../life/car';
import { afterPrint } from '../life/idle';
import { scroll } from '../life/scroll';
import { onLayout } from '../life/layout';

/**
 * The Profile, set as a feature: a standfirst and one short story with a
 * drop cap (and the Sudoku, linked), a box of numbers beside it that count
 * up once as they arrive, and under both the Weekend Edition — what I do off
 * the clock, filed under the paper's own sections. Nothing else moves here:
 * the headline sets itself like type, and a little car drives the rule under
 * it as you scroll.
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
            <p className="about-standfirst">
              I&rsquo;m Tejal. I build software that feels obvious: AI agents that
              talk to real systems, data pipelines that hold up, and small things
              that are fun to use.
            </p>
            <p className="about-body">
              Started out in electronics engineering, then wandered over to the
              software side and stayed. I&rsquo;ve pushed a federated-learning
              experiment from fifty simulated clients to a million, and spent four
              months on a security team chasing shadow AI and untangling who can
              log in to what. These days I&rsquo;m teaching AI agents to talk to
              real systems. Weekends are for things nobody asked for: type, Dime,
              and{' '}
              <a className="about-link" href="https://sudoku.tgoyal.me" target="_blank" rel="noopener noreferrer">
                a Sudoku with no ads<span className="about-link-arrow" aria-hidden="true">↗</span>
              </a>.
            </p>
          </div>

          <aside className="about-col about-col--rail" aria-labelledby="about-numbers-title">
            <p className="about-rail-kicker" id="about-numbers-title">By the numbers</p>
            <dl className="about-numbers">
              <div className="about-num">
                <dt className="about-num-label">MEng GPA</dt>
                <dd className="about-num-fig">
                  <CountUp value="8.82" />
                  <span className="about-num-of">/9.0</span>
                </dd>
              </div>
              <div className="about-num">
                <dt className="about-num-label">GRE, quant</dt>
                <dd className="about-num-fig">
                  <CountUp value="167" />
                  <span className="about-num-of">/170</span>
                </dd>
              </div>
              <div className="about-num">
                <dt className="about-num-label">Side projects, and counting</dt>
                <dd className="about-num-fig">
                  <CountUp value="5" />
                  <span className="about-num-of">live</span>
                </dd>
              </div>
              <div className="about-num">
                <dt className="about-num-label">Claude Pro, since</dt>
                <dd className="about-num-fig">
                  Feb <span className="about-num-yr">&rsquo;26</span>
                </dd>
              </div>
            </dl>
          </aside>
        </div>

        <OffTheClock />
      </div>
    </section>
  );
}
