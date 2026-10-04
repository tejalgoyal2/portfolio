import { useEffect, useRef } from 'react';

/**
 * Mounts the shared WebGL stage. three.js is not in the first paint: the stage
 * module (and three with it) is imported only after the loader has lifted, the
 * lead headline has had a moment to set, and the browser is idle — so the cube
 * fades in as the last thing on the front page. The canvas never takes
 * pointer events; clicks reach it through the paper-press listener. The button
 * is the keyboard handle — it rides over the cube, and U D F B R L (or Enter)
 * twist a face.
 */
export default function CubeStage() {
  const canvasRef = useRef(null);
  const hitRef = useRef(null);

  useEffect(() => {
    let stopped = false;
    let stage = null;

    let wait = 0;
    const start = async () => {
      if (stopped) return;
      const { startStage } = await import('./stage');
      if (stopped) return;
      stage = await startStage(canvasRef.current, hitRef.current);
      if (stopped) stage?.stop();
    };
    const boot = () => {
      const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 150));
      wait = setTimeout(() => idle(start, { timeout: 1200 }), 650);
    };

    if (sessionStorage.getItem('press-loaded')) boot();
    else window.addEventListener('press:loaded', boot, { once: true });

    return () => {
      stopped = true;
      clearTimeout(wait);
      window.removeEventListener('press:loaded', boot);
      stage?.stop();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="stage-canvas" aria-hidden="true" />
      <button
        ref={hitRef}
        type="button"
        className="cube-handle"
        aria-label="Rubik's cube. Press U, D, F, B, R or L to twist a face; it solves itself as you scroll."
      />
    </>
  );
}
