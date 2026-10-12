import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import KineticHeadline from '../press/KineticHeadline';
import Redacted from '../press/Redacted';
import { typeOut, settle, handwrite } from '../life/writeIn';
import { startCar } from '../life/car';
import { afterPrint } from '../life/idle';

/**
 * The Feature Story — a broadsheet profile in three columns: a drop-cap lead
 * with a red pull-quote, the continued prose, and a stats/marginalia rail.
 * Each column gets its words a different way (src/life/writeIn.js): the lead is
 * typed out, the body arrives jumbled and shakes into place, and the margin
 * notes are handwritten by a pencil. The rail's rows are pasted in, the
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
          stops = [
            typeOut(root.querySelector('.about-lead')),
            ...[...root.querySelectorAll('.about-col--body p')].map(settle),
            handwrite(root.querySelector('.about-margin'), ICON.pencil),
            // the car on the rule: across as the rule climbs the screen
            startCar(grid, {
              pathAt: (x) => ({ x: 34 + x, y: -3, angle: 0 }),
              length: () => grid.clientWidth - 68,
              target: () => {
                const r = grid.getBoundingClientRect();
                const vh = window.innerHeight;
                const p = Math.min(1, Math.max(0, (vh * 0.95 - r.top) / (vh * 0.85)));
                return p * (grid.clientWidth - 68);
              },
            }),
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

  const PQ = '“I treat AI-generated code as untrusted by default.”';

  return (
    <section ref={rootRef} className="about" aria-label="Profile" data-ground="paper" data-section="about">
      <div className="press-container">
        <header className="about-head" data-depart="lift">
          <span className="kicker">Profile</span>
          <KineticHeadline as="h2" font="name" className="about-headline">
            I treat my own code as a suspect
          </KineticHeadline>
        </header>

        <div className="about-grid">
          {/* Column 1 — lead + pull-quote */}
          <div className="about-col about-col--lead" data-depart="part-l">
            <p className="about-lead">
              I started in electronics engineering, detoured through a
              federated-learning lab where I scaled experiments from 50 to a
              million simulated clients, spent a winter on a cybersecurity desk
              hunting shadow AI and chasing a malicious binary to ground — and now
              I build and modernize the financial apps BCI&rsquo;s investment
              teams depend on: React/Azure rebuilds, platform tooling, AI
              plumbing woven in. The thread through all of it: break things to
              understand them, then build the better version.
            </p>

            <blockquote className="about-pq" data-arrive="pin">
              <span className="about-pq-ghost" aria-hidden="true">{PQ}</span>
              {PQ}
            </blockquote>
          </div>

          {/* Column 2 — continued */}
          <div className="about-col about-col--body" data-depart="lift">
            <p>
              The lab taught me that a result you can&rsquo;t reproduce at scale
              isn&rsquo;t a result. So I kept rebuilding the harness until a
              million clients behaved like fifty — and the bugs that fell out on
              the way were the interesting part.
            </p>
            <p>
              The security desk taught me the opposite reflex: assume the thing is
              already compromised, then go looking. I learned to read a binary the
              way a good editor reads a draft — suspicious of every line that looks
              too clean.
            </p>
            <p>
              Those two instincts run together now. An MCP server is a door
              between an AI agent and a company&rsquo;s real systems. I build the
              door — then I spend just as long trying to kick it in.
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
                <dt>Published</dt>
                <dd>1 paper</dd>
              </div>
              <div className="about-stat">
                <dt>Classified</dt>
                <dd><Redacted trigger="scroll" tone="red">82,486</Redacted> emails</dd>
              </div>
            </dl>

            <ul className="about-margin" aria-label="Off the clock">
              <li>F1 on weekends.</li>
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
