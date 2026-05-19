import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Procedural brass padlock — the hero focal object.
 *
 *  - Body: a RoundedBox (slightly tall, rounded corners)
 *  - Shackle: a half-torus on top
 *  - Keyhole detail: a small darker disc on the front face
 *  - Material: brass via MeshPhysicalMaterial with metallic finish
 *
 * Idle behavior: slow Y rotation. Mouse position eases the rotation
 * toward a small target so the cursor "looks at" the object slightly.
 * Single mesh group; cheap to render. No postprocessing needed.
 */
export default function Padlock({ mouseRef, scrollRef }) {
  const groupRef = useRef();
  const shackleRef = useRef();
  const { invalidate } = useThree();

  useFrame((state, dt) => {
    if (!groupRef.current) return;

    // Smooth idle drift + mouse-driven tilt
    const mx = mouseRef?.current?.x ?? 0;
    const my = mouseRef?.current?.y ?? 0;
    const targetY = mx * 0.45 + state.clock.elapsedTime * 0.12;
    const targetX = -my * 0.28 - 0.15;

    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * Math.min(1, dt * 4);
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * Math.min(1, dt * 4);

    // Subtle bob on scroll progress
    const scroll = scrollRef?.current?.value ?? 0;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.06 - scroll * 0.4;

    // Force redraw because we're in demand frameloop mode
    invalidate();
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} rotation={[-0.15, 0.4, 0]}>
      {/* Body */}
      <RoundedBox
        args={[1.5, 1.6, 0.55]}
        radius={0.22}
        smoothness={6}
        creaseAngle={0.4}
        position={[0, -0.45, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#d6a23c"
          metalness={0.92}
          roughness={0.28}
          clearcoat={0.35}
          clearcoatRoughness={0.4}
          envMapIntensity={1.1}
          reflectivity={0.6}
        />
      </RoundedBox>

      {/* Shackle (half torus) */}
      <mesh
        ref={shackleRef}
        position={[0, 0.55, 0]}
        rotation={[0, 0, 0]}
        castShadow
      >
        <torusGeometry args={[0.52, 0.13, 24, 36, Math.PI]} />
        <meshPhysicalMaterial
          color="#9b8a76"
          metalness={0.95}
          roughness={0.22}
          clearcoat={0.6}
          clearcoatRoughness={0.3}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Keyhole — small darker disc + slot */}
      <mesh position={[0, -0.55, 0.281]}>
        <circleGeometry args={[0.135, 32]} />
        <meshStandardMaterial color="#221608" metalness={0.6} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.78, 0.282]}>
        <boxGeometry args={[0.06, 0.22, 0.001]} />
        <meshStandardMaterial color="#1a0f04" metalness={0.4} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.55, 0.282]}>
        <circleGeometry args={[0.06, 24]} />
        <meshStandardMaterial color="#0d0700" metalness={0.3} roughness={0.8} />
      </mesh>

      {/* "T" engraving stand-in — subtle paper-color inlay on the body */}
      <mesh position={[0, -0.15, 0.281]}>
        <planeGeometry args={[0.55, 0.04]} />
        <meshStandardMaterial color="#3a2a14" metalness={0.4} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.27, 0.281]}>
        <planeGeometry args={[0.08, 0.22]} />
        <meshStandardMaterial color="#3a2a14" metalness={0.4} roughness={0.7} />
      </mesh>
    </group>
  );
}
