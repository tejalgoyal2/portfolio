import { useEffect, useRef } from 'react';
import KineticHeadline from '../press/KineticHeadline';
import OffTheClock from '../press/OffTheClock';
import CountUp from '../press/CountUp';
import { startCar } from '../life/car';
import { afterPrint } from '../life/idle';
import { scroll } from '../life/scroll';
import { onLayout } from '../life/layout';

/**
 * The Profile, set as a feature: one paragraph in the standfirst's voice
 * (type, Dime and the Sudoku linked from it), a box of numbers beside it that count
 * up once as they arrive (the paragraph, and a pen note of favourite subjects
 * under it, run as long as the box does), and under both the Weekend Edition — what I do off
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
              that are fun to use. Making something feel that simple is usually the
              hard part, and the hard part is what I like: the problem that takes
              three attempts and a walk around the block before it gives in. So my
              weekends go to it too, on things nobody asked for (well, I did):{' '}
              <a className="about-link" href="https://type.tgoyal.me" target="_blank" rel="noopener noreferrer">
                type<span className="about-link-arrow" aria-hidden="true">↗</span>
              </a>,{' '}
              <a className="about-link" href="https://dime.tgoyal.me" target="_blank" rel="noopener noreferrer">
                Dime<span className="about-link-arrow" aria-hidden="true">↗</span>
              </a> and{' '}
              <a className="about-link" href="https://sudoku.tgoyal.me" target="_blank" rel="noopener noreferrer">
                a Sudoku with no ads<span className="about-link-arrow" aria-hidden="true">↗</span>
              </a>, because an ad once cost me a winning streak. I&rsquo;m still&nbsp;not&nbsp;over&nbsp;it.
            </p>
            {/* a note in the margin, in pen */}
            <p className="about-aside">
              <span className="about-aside-label">Favourite subjects</span>
              <span className="about-aside-pen">math &amp; quantum physics (and computers, obviously)</span>
            </p>
          </div>

          <aside className="about-col about-col--rail" aria-labelledby="about-numbers-title">
            <p className="about-rail-kicker" id="about-numbers-title">By the numbers</p>
            <dl className="about-numbers">
              <div className="about-num">
                <dt className="about-num-label">M.Eng. GPA</dt>
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
                {/* the cube in the margin: an untouched one is solved by the foot of the page */}
                <dt className="about-num-label">To solve the cube on this page</dt>
                <dd className="about-num-fig">
                  <CountUp value="44" />
                  <span className="about-num-of">moves</span>
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
