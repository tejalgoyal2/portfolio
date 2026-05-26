import { Canvas } from '@react-three/fiber';
import { EffectComposer, ChromaticAberration, Noise, Vignette, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import Protagonist from './Protagonist';
import { useScrollProgressRef } from '../hooks/useScrollProgress';

/**
 * Fixed full-viewport WebGL canvas hosting the morphing protagonist.
 * Lives at z-index 0 behind the HTML content. Scroll progress drives the
 * morph; the mouse position drives a slight inertial rotation (Depth
 * Globe behavior).
 */
export default function ProtagonistCanvas() {
  // Mutable scroll ref (no React re-renders)
  const scrollRef = useRef({ value: 0 });
  useScrollProgressRef((p) => {
    scrollRef.current.value = p;
  });

  // Mouse position normalized to [-1, 1] — for inertial rotation
  const mouseRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 4.2], fov: 38 }}
        gl={{ antialias: true, alpha: true, premultipliedAlpha: false }}
        style={{ background: 'transparent' }}
      >
        <Protagonist scrollRef={scrollRef} mouseRef={mouseRef} />

        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.12}
            luminanceThreshold={0.92}
            luminanceSmoothing={0.4}
            mipmapBlur
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.0018, 0.0022]}
          />
          <Noise opacity={0.045} premultiply blendFunction={BlendFunction.OVERLAY} />
          <Vignette eskil={false} offset={0.2} darkness={0.55} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
