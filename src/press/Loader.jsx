import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { fireImpact } from './PressImpacts';
import { fontsReady } from '../life/fonts';

/**
 * Press start — a blank cream sheet feeds in, an ink roller lays the nameplate
 * TEJAL GOYAL with a CHA-CHUNK, a red plate rides off-register and snaps home,
 * the edition line stamps. ~1.2s, skippable (any key/click), once per session.
 * On finish it sets sessionStorage and dispatches `press:loaded` so the masthead
 * sets its lead story — and the name doesn't leave: the printed plate glides
 * and shrinks straight into the masthead's nameplate while the sheet around it
 * dissolves into the same paper and the masthead's rules draw out under it, so
 * the loader becomes the front page rather than lifting off it.
 */
const SESSION_KEY = 'press-loaded';

export default function Loader() {
  const [done, setDone] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1'
  );
  const rootRef = useRef(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    // Already printed this session — let the masthead set, then stay unmounted.
    if (done) {
      window.dispatchEvent(new Event('press:loaded'));
      return;
    }

    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Hold the page still while the press warms up.
    window.__lenis?.stop();
    document.documentElement.classList.add('press-booting');

    let detachSkip;
    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      detachSkip?.();

      sessionStorage.setItem(SESSION_KEY, '1');
      const loaded = () => window.dispatchEvent(new Event('press:loaded'));

      const unlock = () => {
        window.__lenis?.start();
        document.documentElement.classList.remove('press-booting');
        setDone(true);
      };

      const html = document.documentElement;
      const plate = root.querySelector('.loader-plate');
      const home = document.querySelector('.mast-plate .np');
      if (reduced) {
        loaded();
        gsap.to(root, { opacity: 0, duration: 0.3, onComplete: unlock });
      } else if (!home || window.scrollY > 40) {
        loaded();
        gsap.to(root, { yPercent: -100, duration: 0.7, ease: 'power4.inOut', onComplete: unlock });
      } else {
        // the hand-off: the plate is set into the masthead, the sheet becomes the page
        html.classList.add('np-handoff');
        gsap.killTweensOf(plate);
        const a = plate.getBoundingClientRect();
        const b = home.getBoundingClientRect();
        const s = b.width / Math.max(1, a.width);
        const dx = b.left + b.width / 2 - (a.left + a.width / 2);
        const dy = b.top + b.height / 2 - (a.top + a.height / 2);
        const rules = document.querySelectorAll('.mast-band .mast-rule');
        gsap
          .timeline({
            onComplete: () => {
              html.classList.remove('np-handoff');
              gsap.set(rules, { clearProps: 'transform' });
              unlock();
            },
          })
          .to(root.querySelectorAll('.loader-kicker, .loader-edition, .loader-ghost'), { opacity: 0, y: -8, duration: 0.3, ease: 'power1.in' }, 0)
          // the name is set into the masthead on a blank sheet first…
          .to(plate, { x: dx, y: dy, scale: s, duration: 0.9, ease: 'expo.inOut' }, 0.05)
          // …then the real nameplate takes over under it (a soft crossfade, not a cut),
          // the ink sweeps across it, and the page develops round it
          .add(() => html.classList.remove('np-handoff'), 0.88)
          .to(plate, { opacity: 0, duration: 0.3, ease: 'power1.inOut' }, 0.9)
          .add(() => window.dispatchEvent(new Event('press:landed')), 0.9)
          .add(loaded, 0.95)
          .to(root, { backgroundColor: 'rgba(0,0,0,0)', duration: 0.5, ease: 'power1.inOut' }, 0.95)
          .fromTo(rules, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power3.out', stagger: 0.08 }, 0.95);
      }
    };

    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set('.loader-plate, .loader-edition, .loader-kicker', { opacity: 1, clipPath: 'inset(0)' });
        gsap.delayedCall(0.6, finish);
        return;
      }

      // the press waits on a blank sheet until the type has arrived (a second at most)
      const tl = gsap.timeline({ onComplete: finish, paused: true });
      fontsReady(1000).then(() => tl.play());
      tl.to('.loader-kicker', { opacity: 1, duration: 0.3, ease: 'power1.out' })
        // ink roller lays the nameplate left → right
        .fromTo(
          '.loader-plate',
          { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
          { clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: 'power3.inOut' },
          0.1
        )
        // registration settle
        .fromTo('.loader-plate', { scale: 1.03 }, { scale: 1, duration: 0.4, ease: 'back.out(1.8)' }, '<')
        // red plate rides off-register then snaps home (the riso tell)
        .fromTo(
          '.loader-ghost',
          { clipPath: 'inset(0 100% 0 0)', x: 5, y: 4, opacity: 0.85 },
          { clipPath: 'inset(0 0% 0 0)', x: 0, y: 0, opacity: 0, duration: 0.6, ease: 'power3.inOut' },
          0.18
        )
        // the slam
        .add(() => fireImpact('CHA-CHUNK', window.innerWidth / 2, window.innerHeight / 2 - 30, 'ink'), 0.55)
        // edition line stamps
        .fromTo(
          '.loader-edition',
          { scale: 1.5, opacity: 0, rotate: -6 },
          { scale: 1, opacity: 1, rotate: 0, duration: 0.4, ease: 'back.out(2)' },
          0.6
        )
        .to({}, { duration: 0.25 }); // hold the front page a beat
    }, root);

    const skip = () => finish();
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    detachSkip = () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };

    return () => {
      detachSkip?.();
      ctx.revert();
      // never strand the page locked
      window.__lenis?.start();
      document.documentElement.classList.remove('press-booting');
    };
  }, [done]);

  if (done) return null;

  return (
    <div ref={rootRef} className="press-loader" role="status" aria-label="Starting the press">
      <div className="loader-sheet">
        <span className="loader-kicker">THE PERSONAL PRESS</span>
        <div className="loader-plate-wrap">
          <span className="loader-ghost" aria-hidden="true">TEJAL GOYAL</span>
          {/* set sort by sort exactly like the masthead's nameplate, so the hand-off lines up */}
          <h1 className="loader-plate" aria-label="Tejal Goyal">
            <span className="np" aria-hidden="true">
              {[...'TEJAL GOYAL'].map((ch, i) =>
                ch === ' ' ? (
                  <span className="np-space" key={i}>
                    {' '}
                  </span>
                ) : (
                  <span className="np-sort" key={i}>
                    {ch}
                  </span>
                )
              )}
            </span>
          </h1>
        </div>
        <span className="loader-edition">VOL.&nbsp;I · NO.&nbsp;1 · VICTORIA, BC · EST.&nbsp;2002</span>
      </div>
    </div>
  );
}
