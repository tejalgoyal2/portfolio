import { useEffect, useRef, useState } from 'react';
import KineticHeadline from '../press/KineticHeadline';
import Redacted from '../press/Redacted';
import OffTheClock from '../press/OffTheClock';
import { handwrite } from '../life/writeIn';
import { startCar } from '../life/car';
import { afterPrint } from '../life/idle';
import { scroll } from '../life/scroll';
import { onLayout } from '../life/layout';

/**
 * The Profile — "How long have you got?" The same story, cut to fit: five
 * seconds is one line set big, like a headline; thirty seconds is a short
 * column; two minutes is the whole thing, set as body text. You pick, and the
 * copy re-sets itself (the paragraphs that come in fade in, nothing slides).
 * Beside it, a short rail of numbers (the hard ones rattle like a split-flap
 * as they appear) and the pull quote; under it, what I do off the clock, jotted along the foot
 * of the page by a pencil. A little car drives the rule under the headline.
 */
const LENGTHS = [
  { key: 's', label: '5 sec' },
  { key: 'm', label: '30 sec' },
  { key: 'l', label: '2 min' },
];

// each paragraph says which cuts it's in
const STORY = [
  {
    in: 's',
    text: 'I build software that feels obvious: AI agents, data pipelines, and small things that are fun to use.',
  },
  {
    in: 'ml',
    text: 'I’m Tejal. I build software that feels obvious — AI agents that talk to real systems, data pipelines that hold up, and small things that are fun to use.',
  },
  {
    in: 'm',
    text: 'I started in electronics engineering, scaled federated-learning experiments from fifty simulated clients to a million in a research lab, spent a winter on a security desk, and now build the plumbing that lets AI agents do real work. Weekends, I ship my own: type, Dime, a Sudoku with no ads.',
  },
  {
    in: 'l',
    text: 'I started in electronics engineering. In a research lab I scaled federated-learning experiments from fifty simulated clients to a million. It taught me that a result you can’t reproduce at scale isn’t a result, so I kept rebuilding the harness until a million clients behaved like fifty.',
  },
  {
    in: 'l',
    text: 'Then a winter on a security desk, which is why every door I build, I then try to kick in.',
  },
  {
    in: 'l',
    text: 'These days I build MCP servers so AI agents can query real databases and APIs directly, and I automate the reports people used to put together by hand.',
  },
  {
    in: 'l',
    text: 'Off the clock I ship my own: type, a page where every keystroke has weight; Dime, the expense tracker that roasts your spending; a Sudoku with no ads; and Claubi, a coding helper that asks before it touches anything.',
  },
  { in: 'l', text: 'If you read all of this, we’d probably get along. Say hi at the bottom of the page.' },
];

export default function About() {
  const rootRef = useRef(null);
  const [cut, setCut] = useState('m');

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
          <div className="about-col about-col--story" data-depart="part-l">
            <div className="about-dial" role="radiogroup" aria-label="How long have you got?">
              <span className="about-dial-q">How long have you got?</span>
              {LENGTHS.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  role="radio"
                  aria-checked={cut === l.key}
                  className={`about-dial-opt${cut === l.key ? ' is-on' : ''}`}
                  onClick={() => setCut(l.key)}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className={`about-story about-story--${cut}`} aria-live="polite">
              {STORY.filter((p) => p.in.includes(cut)).map((p) => (
                <p key={`${cut}-${p.text.slice(0, 24)}`} className="about-p">
                  {p.text}
                </p>
              ))}
            </div>

          </div>

          <aside className="about-col about-col--rail" aria-label="By the numbers" data-depart="part-r">
            <dl className="about-stats" data-arrive-items="paste">
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
                <dt>Side projects live</dt>
                <dd><Redacted trigger="scroll" tone="red">5</Redacted> and counting</dd>
              </div>
            </dl>
            <blockquote className="about-pq">“The best software feels obvious. Getting it there never is.”</blockquote>
          </aside>
        </div>

        <OffTheClock />
      </div>
    </section>
  );
}
