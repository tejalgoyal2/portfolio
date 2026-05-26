import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildAllTargets, MORPH_SEQUENCE } from './geometries';

const POINT_COUNT = 900;

/**
 * The morphing protagonist — a 4,500-particle cloud that blends between
 * silhouettes as the page scrolls. Particles also drift on a perlin-style
 * wobble for organic shimmer.
 *
 * Rendering: THREE.Points with a custom ShaderMaterial that handles the
 * morph blend on the GPU. Two adjacent target arrays are kept as buffer
 * attributes (`aPosA`, `aPosB`); CPU swaps them in only when scroll
 * crosses a transition boundary, so per-frame work is one uniform write.
 */
export default function Protagonist({ scrollRef, mouseRef }) {
  const pointsRef = useRef();
  const matRef = useRef();
  const { size } = useThree();

  const targets = useMemo(() => buildAllTargets(POINT_COUNT), []);

  // Per-particle randomness for shader-side jitter (size, color tint)
  const randoms = useMemo(() => {
    const arr = new Float32Array(POINT_COUNT);
    for (let i = 0; i < POINT_COUNT; i++) arr[i] = Math.random();
    return arr;
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    // `position` is the standard attribute three.js requires for any
    // rendering pipeline (frustum culling, bounding box, fallback paths).
    // It's a CLONE of target 0 so the geometry has a valid shape even
    // before the morph attributes are used by the custom shader.
    geo.setAttribute('position', new THREE.BufferAttribute(targets[0].slice(), 3));
    geo.setAttribute('aPosA', new THREE.BufferAttribute(targets[0], 3));
    geo.setAttribute('aPosB', new THREE.BufferAttribute(targets[1], 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(randoms, 1));
    geo.computeBoundingSphere();
    return geo;
  }, [targets, randoms]);

  // Track which transition is currently bound so we know when to swap
  const boundRef = useRef({ a: 0, b: 1 });

  useFrame((state, dt) => {
    if (!matRef.current || !pointsRef.current) return;
    const scroll = scrollRef?.current?.value ?? 0;
    const n = MORPH_SEQUENCE.length;
    const span = scroll * n;            // 0..N
    const aIdx = Math.floor(span) % n;
    const bIdx = (aIdx + 1) % n;
    const local = span - Math.floor(span); // 0..1 inside this transition

    if (boundRef.current.a !== aIdx || boundRef.current.b !== bIdx) {
      // re-bind attributes
      geometry.setAttribute('aPosA', new THREE.BufferAttribute(targets[aIdx], 3));
      geometry.setAttribute('aPosB', new THREE.BufferAttribute(targets[bIdx], 3));
      boundRef.current = { a: aIdx, b: bIdx };
    }

    matRef.current.uniforms.uMorph.value = smoothstep(local);
    matRef.current.uniforms.uTime.value += dt;

    // Mouse-driven rotation (Depth Globe inertia) — slight target rotation
    // that the mesh eases toward each frame.
    const mx = mouseRef?.current?.x ?? 0;
    const my = mouseRef?.current?.y ?? 0;
    const targetRotY = mx * 0.5;
    const targetRotX = -my * 0.35;
    const obj = pointsRef.current;
    obj.rotation.y += (targetRotY - obj.rotation.y) * 0.04;
    obj.rotation.x += (targetRotX - obj.rotation.x) * 0.04;

    // Idle drift — slow continuous y rotation so the form breathes
    obj.rotation.y += dt * 0.06;
  });

  // Responsive dpr / point size
  useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uResolution.value.set(size.width, size.height);
    }
  }, [size.width, size.height]);

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        uniforms={{
          uMorph: { value: 0 },
          uTime:  { value: 0 },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uPaper: { value: new THREE.Color('#f1ead8') },
          uRed:   { value: new THREE.Color('#ff3a4a') },
          uCyan:  { value: new THREE.Color('#5cd9f5') },
          uYellow:{ value: new THREE.Color('#f6e25c') },
          uPointSize: { value: 2.2 },
        }}
        vertexShader={VERT}
        fragmentShader={FRAG}
      />
    </points>
  );
}

function smoothstep(x) {
  // Hermite smoothstep — eases the morph at the boundaries
  return x * x * (3 - 2 * x);
}

// ── Shaders ──────────────────────────────────────────────────────────

const VERT = /* glsl */ `
attribute vec3 aPosA;
attribute vec3 aPosB;
attribute float aRand;

uniform float uMorph;
uniform float uTime;
uniform vec2 uResolution;
uniform float uPointSize;

varying float vRand;
varying vec3 vPos;

void main() {
  // Blend the two target positions
  vec3 pos = mix(aPosA, aPosB, uMorph);

  // Subtle organic wobble — different phase per particle
  float t = uTime * 0.6 + aRand * 6.28;
  pos += 0.02 * vec3(
    sin(t * 1.2 + pos.y * 4.0),
    cos(t * 0.9 + pos.x * 4.0),
    sin(t * 1.1 + pos.z * 4.0)
  );

  // During a transition (uMorph near 0.5), inflate slightly for a "burst" feel
  float burst = 1.0 + 0.10 * sin(uMorph * 3.14159);
  pos *= burst;

  // Scale up overall so points read as a sparse halftone field
  pos *= 1.7;

  vRand = aRand;
  vPos = pos;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Perspective-corrected point size — closer particles get bigger.
  // Keep range modest so we don't get blurry mega-discs near the camera.
  float distance = -mvPosition.z;
  gl_PointSize = uPointSize * (220.0 / distance) * (0.7 + aRand * 0.5);
}
`;

const FRAG = /* glsl */ `
uniform vec3 uPaper;
uniform vec3 uRed;
uniform vec3 uCyan;
uniform vec3 uYellow;

varying float vRand;
varying vec3 vPos;

void main() {
  // Crisp round point — sharper falloff for halftone "printed" feel
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.44, d);

  // Color: mostly paper, sparse three-tone accents — true halftone bleed
  vec3 color = uPaper;
  if (vRand > 0.97)      color = uRed;
  else if (vRand > 0.93) color = uCyan;
  else if (vRand > 0.89) color = uYellow;

  // Depth dim — particles further from camera fade toward ink
  float depthDim = clamp(0.6 + vPos.z * 0.45, 0.35, 1.0);
  color *= depthDim;

  gl_FragColor = vec4(color, alpha * 0.5);
}
`;
