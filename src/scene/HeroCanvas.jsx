import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { useRef, useEffect, Suspense } from 'react';
import Padlock from './Padlock';
import { useScrollProgressRef } from '../hooks/useScrollProgress';

/**
 * Lean R3F canvas hosting ONE focal object (the padlock).
 *
 * Perf:
 *  - frameloop="demand" — only renders on invalidate() or prop change.
 *    The padlock's useFrame calls invalidate() to drive its own idle.
 *  - dpr cap 1.5 — sharp without blowing up to 2× on retina.
 *  - No postprocessing chain — the visual signal is bold typography +
 *    a single metallic mesh; we don't need film-grade FX on top.
 *  - Page Visibility — pauses when tab hidden.
 *  - Environment preset for IBL gives photoreal brass without any
 *    custom shader work; ~50KB one-time load.
 */
export default function HeroCanvas({ className = '', style }) {
  const scrollRef = useRef({ value: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });

  useScrollProgressRef((p) => {
    scrollRef.current.value = p;
  });

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className={className} style={style}>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.2, 4.5], fov: 32 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
        shadows={false}
      >
        {/* warm key light */}
        <directionalLight position={[3.5, 4, 2.5]} intensity={1.4} color="#fff2d0" />
        {/* fill */}
        <directionalLight position={[-2, 0, 1.5]} intensity={0.45} color="#fff" />
        {/* rim from behind */}
        <directionalLight position={[0, -1, -3]} intensity={0.6} color="#ffcc88" />
        <ambientLight intensity={0.35} color="#fff6db" />

        <Suspense fallback={null}>
          <Environment preset="warehouse" background={false} />
        </Suspense>

        <Padlock mouseRef={mouseRef} scrollRef={scrollRef} />
      </Canvas>
    </div>
  );
}
