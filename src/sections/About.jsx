import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import KineticHeadline from '../press/KineticHeadline';
import Redacted from '../press/Redacted';
import { handwrite } from '../life/writeIn';
import { startMarkup } from '../life/markup';
import { startCar } from '../life/car';
import { afterPrint } from '../life/idle';
import { scroll } from '../life/scroll';
import { onLayout } from '../life/layout';

/**
 * The Feature Story — a broadsheet profile in three columns: a drop-cap lead
 * with a red pull-quote, the continued prose, and a stats/marginalia rail.
 * The prose inks in line by line as you read, and then the editor goes over
 * it in red pen (src/life/markup.js): a phrase circled here, one underlined
 * there, a note in the margin — hover a marked phrase and they go over it
 * again. The margin notes are handwritten by a pencil. The rail's rows are pasted in, the
 * pull-quote rides off-register and snaps home, the hard numbers declassify on
 * scroll — and a little car drives the rule under the headline as you go.
 */
export default function About() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (reduced) return;

      gsap.fromTo(
        '.about-pq-ghost',
        { x: 4, y: 3, opacity: 0.8 },
        {
          x: 0,
          y: 0,
          opacity: 0,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.about-pq', start: 'top 78%', once: true },
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  // the words, once fonts and layout have settled
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
          const { ICON } = await import('../life/icons');
          if (cancelled) return;
          const grid = root.querySelector('.about-grid');
          const road = { top: 0, w: 1 };
          const measureRoad = () => {
            road.top = grid.getBoundingClientRect().top + scroll.y;
            road.w = grid.clientWidth - 68;
          };
          measureRoad();
          stops = [
            startMarkup(grid),
            handwrite(root.querySelector('.about-margin'), ICON.pencil),
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

  const PQ = '“The best software feels obvious. Getting it there never is.”';

  return (
    <section ref={rootRef} className="about" aria-label="Profile" data-ground="paper" data-section="about">
      <div className="press-container">
        <header className="about-head" data-depart="lift">
          <span className="kicker">Profile</span>
          <KineticHeadline as="h2" font="name" className="about-headline">
            I build the version that just works
          </KineticHeadline>
        </header>

        <div className="about-grid">
          {/* Column 1 — lead + pull-quote */}
          <div className="about-col about-col--lead" data-depart="part-l">
            <p className="about-lead" data-ink="block">
              I started in electronics engineering, spent a lab stint scaling
              federated-learning experiments from{' '}
              <span data-mark="circle" data-mark-id="scale" data-note="!!">50 to a million</span> simulated clients, and a winter on a
              security desk. Now I&rsquo;m on BCI&rsquo;s Enterprise Solutions
              team, rebuilding the financial apps its investment teams run on —
              React and Azure, data pipelines, and the plumbing that lets{' '}
              <span data-mark="underline" data-mark-id="agents" data-note="the fun part">
                AI agents talk to real systems
              </span>
              .
            </p>

            <blockquote className="about-pq" data-arrive="pin">
              <span className="about-pq-ghost" aria-hidden="true">{PQ}</span>
              {PQ}
            </blockquote>
          </div>

          {/* Column 2 — continued */}
          <div className="about-col about-col--body" data-depart="lift">
            <p data-ink>
              The lab taught me that{' '}
              <span data-mark="underline" data-mark-id="repro" data-note="rule #1">
                a result you can&rsquo;t reproduce at scale isn&rsquo;t a result
              </span>
              . So I kept rebuilding the harness until a million clients behaved
              like fifty.
            </p>
            <p data-ink>
              At BCI that turned into building{' '}
              <span data-mark="circle" data-mark-id="mcp" data-note="MCP!">
                MCP servers
              </span>{' '}
              so AI agents can query financial databases and app APIs directly,
              and automating the reports people used to put together by hand.
            </p>
            <p data-ink>
              Off the clock I ship my own: type, a page where every keystroke has
              weight; Dime, the expense tracker that roasts your spending; a Sudoku
              with no ads. The security years didn&rsquo;t go anywhere — they&rsquo;re
              why every door I build, I then try to{' '}
              <span data-mark="scribble" data-mark-id="kick" data-note="always.">
                kick in
              </span>
              .
            </p>
          </div>

          {/* Column 3 — stats + marginalia */}
          <aside className="about-col about-col--rail" aria-label="By the numbers" data-depart="part-r">
            <dl className="about-stats" data-arrive-items="paste">
              <div className="about-stat">
                <dt>Based in</dt>
                <dd>Victoria, BC</dd>
              </div>
              <div className="about-stat">
                <dt>Since</dt>
                <dd>2002</dd>
              </div>
              <div className="about-stat">
                <dt>MEng GPA</dt>
                <dd><Redacted trigger="scroll">8.82 / 9.0</Redacted></dd>
              </div>
              <div className="about-stat">
                <dt>GRE — Quant</dt>
                <dd><Redacted trigger="scroll">167 / 170</Redacted></dd>
              </div>
              <div className="about-stat">
                <dt>Contributed to</dt>
                <dd>1 published paper</dd>
              </div>
              <div className="about-stat">
                <dt>Side projects live</dt>
                <dd><Redacted trigger="scroll" tone="red">5</Redacted> and counting</dd>
              </div>
            </dl>

            <ul className="about-margin" aria-label="Off the clock">
              <li>F1 on weekends.</li>
              <li>Speedcubes (hence the cube).</li>
              <li>Folded an origami MiG-29.</li>
              <li>Card tricks, on request.</li>
              <li>Co-founded an NGO with my brother — 1,000+ trees in.</li>
              <li>State-level badminton, once.</li>
              <li>Finished the TC10K (slowly).</li>
              <li>Will bake you a loaf.</li>
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
