import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { fontsReady } from '../life/fonts';

/**
 * Press start — a blank cream sheet feeds in, an ink roller lays the nameplate
 * TEJAL GOYAL, a red plate rides off-register and settles home, the edition
 * line stamps. ~2s, skippable (any key/click), once per session.
 * On finish it sets sessionStorage and dispatches `press:loaded` so the masthead
 * sets its lead story — and the name doesn't leave: the printed plate glides
 * straight into the masthead's nameplate while the sheet around it
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
        releaseHold();
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
        // the hand-off: the plate travels up into the masthead while the page
        // develops round it, and the real nameplate takes over only once it's
        // in plain view under the copy — so there's never a bare frame
        html.classList.add('np-handoff');
        gsap.killTweensOf(plate);
        root.style.pointerEvents = 'none';
        const a = plate.getBoundingClientRect();
        const b = home.getBoundingClientRect();
        const s = b.width / Math.max(1, a.width);
        const dx = b.left + b.width / 2 - (a.left + a.width / 2);
        const dy = b.top + b.height / 2 - (a.top + a.height / 2);
        const rules = document.querySelectorAll('.mast-band .mast-rule');
        const FLY = 1.2;
        gsap
          .timeline({
            onComplete: () => {
              gsap.set(rules, { clearProps: 'transform' });
              unlock();
            },
          })
          .to(root.querySelectorAll('.loader-kicker, .loader-edition, .loader-ghost'), { opacity: 0, y: -8, duration: 0.4, ease: 'power1.in' }, 0)
          .to(plate, { x: dx, y: dy, scale: s, duration: FLY, ease: 'power3.inOut' }, 0.08)
          // the sheet thins into the page once the name has cleared the lead
          // story, and is gone just as it settles home
          .to(root.querySelector('.loader-paper'), { opacity: 0, duration: 0.65, ease: 'power1.inOut' }, 0.7)
          .fromTo(rules, { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, 0.85)
          .add(loaded, 0.95)
          // home: the real plate shows and the copy goes in the same frame, then the ink runs along it
          .add(() => {
            html.classList.remove('np-handoff');
            plate.style.opacity = '0';
            window.dispatchEvent(new Event('press:landed'));
          }, 1.36)
          .to({}, { duration: 0.1 });
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
      tl.to('.loader-kicker', { opacity: 1, duration: 0.45, ease: 'power1.out' })
        // ink roller lays the nameplate left → right
        .fromTo(
          '.loader-plate',
          { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
          { clipPath: 'inset(0 0% 0 0)', duration: 0.95, ease: 'power2.inOut' },
          0.15
        )
        // registration settle
        .fromTo('.loader-plate', { scale: 1.025 }, { scale: 1, duration: 0.7, ease: 'power3.out' }, '<')
        // red plate rides off-register then settles home (the riso tell)
        .fromTo(
          '.loader-ghost',
          { clipPath: 'inset(0 100% 0 0)', x: 5, y: 4, opacity: 0.85 },
          { clipPath: 'inset(0 0% 0 0)', x: 0, y: 0, opacity: 0, duration: 1, ease: 'power2.inOut' },
          0.24
        )
        // edition line stamps
        .fromTo(
          '.loader-edition',
          { scale: 1.3, opacity: 0, rotate: -4 },
          { scale: 1, opacity: 1, rotate: 0, duration: 0.5, ease: 'back.out(1.6)' },
          0.95
        )
        .to({}, { duration: 0.45 }); // hold the front page a beat
    }, root);

    // a click, a key or a scroll skips ahead to the hand-off; the scroll itself
    // goes nowhere until the name is home (the page is held until then)
    const skip = () => finish();
    const hold = (e) => {
      if (e.cancelable) e.preventDefault();
      finish();
    };
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    window.addEventListener('wheel', hold, { passive: false });
    window.addEventListener('touchmove', hold, { passive: false });
    detachSkip = () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
    // the scroll stays held through the hand-off too, until unlock
    const releaseHold = () => {
      window.removeEventListener('wheel', hold);
      window.removeEventListener('touchmove', hold);
    };

    return () => {
      detachSkip?.();
      releaseHold();
      ctx.revert();
      // never strand the page locked
      window.__lenis?.start();
      document.documentElement.classList.remove('press-booting');
    };
  }, [done]);

  if (done) return null;

  return (
    <div ref={rootRef} className="press-loader" role="status" aria-label="Starting the press">
      {/* the blank sheet, its own layer so it can thin away by opacity alone */}
      <span className="loader-paper" aria-hidden="true" />
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
        <span className="loader-edition">VOL.&nbsp;I · NO.&nbsp;1 · INK STILL WET</span>
      </div>
    </div>
  );
}
