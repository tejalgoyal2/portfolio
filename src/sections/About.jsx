import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import KineticHeadline from '../press/KineticHeadline';
import Redacted from '../press/Redacted';
import OffTheClock from '../press/OffTheClock';
import Hand from '../press/Hand';
import { handwrite } from '../life/writeIn';
import { startMarkup } from '../life/markup';
import { startCar } from '../life/car';
import { afterPrint } from '../life/idle';
import { scroll } from '../life/scroll';
import { onLayout } from '../life/layout';

/**
 * The Profile, as an interview: the editor's questions written into the copy
 * in red pencil, in a natural hand (src/press/Hand.jsx), each one written out
 * by the pencil as you reach it (src/life/writeIn.js), and the answers set in
 * type under them — the first with a drop cap, then a red pull-quote. The
 * answers ink in line by line as you read, and the editor circles or
 * underlines a phrase here and there in red pen (src/life/markup.js). The
 * rail: the numbers (pasted in; the hard ones declassify on scroll) and what
 * I do off the clock. A little car drives the rule under the headline.
 */
/** One of the editor's questions, in red pencil. */
function Q({ children }) {
  return (
    <p className="about-q">
      <Hand>{children}</Hand>
    </p>
  );
}

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
            // the editor writes each question as you reach it
            ...[...root.querySelectorAll('.about-q')].map((q) => handwrite(q, ICON.pencil)),
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
          <p className="about-deck">Five questions from the editor, answered.</p>
        </header>

        <div className="about-grid">
          {/* Column 1 — the first two questions, and the pull-quote */}
          <div className="about-col about-col--lead" data-depart="part-l">
            <Q>So what do you actually do?</Q>
            <p className="about-lead" data-ink="block">
              Right now I&rsquo;m on BCI&rsquo;s Enterprise Solutions team,
              rebuilding the financial apps its investment teams run on — React and Azure, data
              pipelines, and the plumbing that lets{' '}
              <span data-mark="underline" data-mark-id="agents">
                AI agents talk to real systems.
              </span>
            </p>
            <Q>How did you end up here?</Q>
            <p className="about-a" data-ink>
              Electronics engineering first. Then a lab stint scaling
              federated-learning experiments from{' '}
              <span data-mark="circle" data-mark-id="scale">50 to a million</span>{' '}
              simulated clients, and a winter on a security desk.
            </p>

            <blockquote className="about-pq" data-arrive="pin">
              <span className="about-pq-ghost" aria-hidden="true">{PQ}</span>
              {PQ}
            </blockquote>
          </div>

          {/* Column 2 — the rest of the interview */}
          <div className="about-col about-col--body" data-depart="lift">
            <Q>What did the lab teach you?</Q>
            <p className="about-a" data-ink>
              That{' '}
              <span data-mark="underline" data-mark-id="repro">
                a result you can&rsquo;t reproduce at scale isn&rsquo;t a result.
              </span>{' '}
              I kept rebuilding the harness until a million clients behaved
              like fifty.
            </p>
            <Q>And at BCI?</Q>
            <p className="about-a" data-ink>
              Building{' '}
              <span data-mark="circle" data-mark-id="mcp">
                MCP servers
              </span>{' '}
              so AI agents can query financial databases and app APIs directly,
              and automating the reports people used to put together by hand.
            </p>
            <Q>What do you build when nobody&rsquo;s asking?</Q>
            <p className="about-a" data-ink>
              My own things: type, a page where every keystroke has weight; Dime,
              the expense tracker that roasts your spending; a Sudoku with no ads.
              The security years didn&rsquo;t go anywhere — they&rsquo;re why
              every door I build, I then try to{' '}
              <span data-mark="scribble" data-mark-id="kick">
                kick in.
              </span>
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

            <OffTheClock />
          </aside>
        </div>
      </div>
    </section>
  );
}
