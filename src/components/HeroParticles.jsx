import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function ParticleField({ scrollProgress, count = 2500 }) {
  const pointsRef = useRef();
  const mouseRef = useRef({ x: 0, y: 0 });
  const { viewport } = useThree();

  const [positions, basePositions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const x = (Math.random() - 0.5) * 16;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 8;

      // Start at final positions — no blast, just appear
      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;
      base[i3] = x;
      base[i3 + 1] = y;
      base[i3 + 2] = z;

      const r = 0.55 + Math.random() * 0.35;
      const g = 0.55 + Math.random() * 0.35;
      const b = 0.65 + Math.random() * 0.3;

      if (Math.random() < 0.08) {
        col[i3] = 0.55;
        col[i3 + 1] = 0.55;
        col[i3 + 2] = 1.0;
      } else if (Math.random() < 0.05) {
        col[i3] = 1.0;
        col[i3 + 1] = 0.7;
        col[i3 + 2] = 0.4;
      } else {
        col[i3] = r;
        col[i3 + 1] = g;
        col[i3 + 2] = b;
      }
    }

    return [pos, base, col];
  }, [count]);

  useFrame(({ clock, pointer }) => {
    if (!pointsRef.current) return;

    const time = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    // Smooth mouse tracking — gentle follow, no jerk
    mouseRef.current.x += (pointer.x * viewport.width * 0.5 - mouseRef.current.x) * 0.04;
    mouseRef.current.y += (pointer.y * viewport.height * 0.5 - mouseRef.current.y) * 0.04;

    const posArray = pointsRef.current.geometry.attributes.position.array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const bx = basePositions[i3];
      const by = basePositions[i3 + 1];
      const bz = basePositions[i3 + 2];

      const drift = Math.sin(time * 0.3 + i * 0.01) * 0.15;
      const driftY = Math.cos(time * 0.2 + i * 0.013) * 0.1;

      // Mouse influence — wide radius, noticeable push
      const dx = bx - mouseRef.current.x;
      const dy = by - mouseRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const influence = Math.max(0, 1 - dist / 5) * 0.9;

      // Smooth scroll scatter
      const scatter = scroll * scroll * 3;
      const scatterDir = i % 2 === 0 ? 1 : -1;

      posArray[i3] = bx + drift + dx * influence * 0.18 + (bx * scatter * scatterDir);
      posArray[i3 + 1] = by + driftY + dy * influence * 0.18 + (by * scatter);
      posArray[i3 + 2] = bz + Math.sin(time * 0.15 + i * 0.02) * 0.1 - scroll * 2;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Gentle fade in on load, smooth fade on scroll
    const fadeIn = Math.min(1, time / 1.2);
    const scrollFade = Math.max(0, 1 - scroll * 2);
    pointsRef.current.material.opacity = fadeIn * scrollFade;
  });

  return (
    <Points ref={pointsRef} positions={positions} colors={colors} stride={3}>
      <PointMaterial
        vertexColors
        transparent
        size={0.025}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0}
      />
    </Points>
  );
}

export default function HeroParticles({ scrollProgress, count = 2500 }) {
  return (
    <div className="absolute inset-0" aria-hidden="true" role="presentation">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ParticleField scrollProgress={scrollProgress} count={count} />
      </Canvas>
    </div>
  );
}
