import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import KineticHeadline from '../press/KineticHeadline';
import Redacted from '../press/Redacted';

/**
 * The Feature Story — a broadsheet profile in three columns: a drop-cap lead
 * with a red pull-quote, the continued prose, and a stats/marginalia rail.
 * Columns rise on enter; the pull-quote rides off-register and snaps home;
 * the rail's hard numbers come in redacted and declassify on scroll.
 */
export default function About() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (reduced) return;

      gsap.from('.about-col', {
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: root, start: 'top 72%', once: true },
      });

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

  const PQ = '“I treat AI-generated code as untrusted by default.”';

  return (
    <section ref={rootRef} className="about" aria-label="Profile">
      <div className="press-container">
        <header className="about-head">
          <span className="kicker">Profile</span>
          <KineticHeadline as="h2" font="name" className="about-headline">
            He treats his own code as a suspect
          </KineticHeadline>
        </header>

        <div className="about-grid">
          {/* Column 1 — lead + pull-quote */}
          <div className="about-col about-col--lead">
            <p className="about-lead">
              I started in electronics engineering, detoured through a
              federated-learning lab where I scaled experiments from 50 to a
              million simulated clients, spent a winter on a cybersecurity desk
              hunting shadow AI and chasing a malicious binary to ground — and now
              I build the MCP servers that let AI agents talk to enterprise
              systems. The thread through all of it: break things to understand
              them, then build the better version.
            </p>

            <blockquote className="about-pq">
              <span className="about-pq-ghost" aria-hidden="true">{PQ}</span>
              {PQ}
            </blockquote>
          </div>

          {/* Column 2 — continued */}
          <div className="about-col about-col--body">
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
          <aside className="about-col about-col--rail" aria-label="On the record">
            <dl className="about-stats">
              <div className="about-stat">
                <dt>Dateline</dt>
                <dd>Victoria, BC</dd>
              </div>
              <div className="about-stat">
                <dt>Established</dt>
                <dd>2017</dd>
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
                <dt>On the record</dt>
                <dd>1 published paper</dd>
              </div>
              <div className="about-stat">
                <dt>Classified</dt>
                <dd><Redacted trigger="scroll" tone="red">82,486</Redacted> emails</dd>
              </div>
            </dl>

            <ul className="about-margin" aria-label="Off the record">
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
