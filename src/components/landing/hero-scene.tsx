"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Mesh, Group } from "three";

// 3D education ecosystem for the landing hero.
// Performance safeguards: lazy-loaded (dynamic import), desktop-only
// (parent hides below lg), pauses when offscreen, skipped entirely
// under prefers-reduced-motion. Low-poly primitives only — no model
// assets, no post-processing.

function useReducedMotionFlag(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/* ---------------- Scene pieces ---------------- */

function Book({ position, rotation, color, scale = 1 }: { position: [number, number, number]; rotation: [number, number, number]; color: string; scale?: number }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = position[1] + Math.sin(t * 0.7 + position[0]) * 0.18;
    ref.current.rotation.y += 0.0022;
  });
  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh>
        <boxGeometry args={[1.15, 0.16, 0.85]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[1.05, 0.03, 0.75]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Laptop({ position }: { position: [number, number, number] }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.6 + 1.2) * 0.15;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.3;
  });
  return (
    <group ref={ref} position={position} rotation={[0.1, 0, 0]}>
      <mesh>
        <boxGeometry args={[1.3, 0.07, 0.9]} />
        <meshStandardMaterial color="#2d2d3d" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.42, -0.42]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[1.3, 0.8, 0.04]} />
        <meshStandardMaterial color="#101223" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.4, -0.38]} rotation={[-0.25, 0, 0]}>
        <planeGeometry args={[1.16, 0.66]} />
        <meshBasicMaterial color="#6d28d9" />
      </mesh>
    </group>
  );
}

function VideoScreen({ position }: { position: [number, number, number] }) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8 + 0.6) * 0.2;
  });
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.6, 1, 0.06]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.4} />
      </mesh>
      <mesh ref={ref} position={[0, 0, 0.04]}>
        <planeGeometry args={[1.44, 0.84]} />
        <meshBasicMaterial color="#0d9488" />
      </mesh>
      {/* Play triangle */}
      <mesh position={[0, 0, 0.08]}>
        <coneGeometry args={[0.12, 0.22, 3]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function Person({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.55 + position[0] * 2) * 0.12;
  });
  return (
    <group ref={ref} position={position}>
      <mesh>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.3, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
    </group>
  );
}

function CourseCard({ position, rotation, color }: { position: [number, number, number]; rotation: [number, number, number]; color: string }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.65 + 2.2) * 0.15;
    ref.current.rotation.y += 0.0015;
  });
  return (
    <group ref={ref} position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[0.7, 0.5, 0.05]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.12, 0.03]}>
        <boxGeometry args={[0.5, 0.14, 0.01]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  );
}

function FloatingParticles({ count = 14 }: { count?: number }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.001;
  });
  // Deterministic pseudo-random layout (pure — no Math.random in render).
  const particles = Array.from({ length: count }, (_, i) => {
    const seeded = (salt: number) => {
      const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    return {
      pos: [
        (seeded(1) - 0.5) * 5,
        (seeded(2) - 0.5) * 3.4,
        (seeded(3) - 0.5) * 2.5,
      ] as [number, number, number],
      scale: 0.015 + seeded(4) * 0.035,
    };
  });
  return (
    <group ref={ref}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.pos} scale={p.scale}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color={i % 3 === 0 ? "#8b5cf6" : i % 3 === 1 ? "#2dd4bf" : "#ffffff"} transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------- Camera rig (mouse parallax) ---------------- */

function CameraRig() {
  const { camera, pointer } = useThree();
  const cam = useRef(camera);
  useFrame(() => {
    const c = cam.current;
    c.position.x += (pointer.x * 0.35 - c.position.x) * 0.04;
    c.position.y += (-pointer.y * 0.25 - c.position.y) * 0.04;
    c.lookAt(0, 0, 0);
  });
  return null;
}

/* ---------------- Offscreen pause (demand frameloop) ---------------- */

function RenderWhileVisible() {
  const { gl, invalidate } = useThree();
  const visibleRef = useRef(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    });
    observer.observe(gl.domElement);
    return () => observer.disconnect();
  }, [gl]);
  // Demand frameloop: render only while the canvas is on screen.
  useFrame(() => {
    if (visibleRef.current) invalidate();
  });
  return null;
}

/* ---------------- Export (default: canvas scene) ---------------- */

export default function HeroScene() {
  const reduced = useReducedMotionFlag();
  if (reduced) return null;

  return (
    <Canvas
      camera={{ position: [0, 0.2, 4.2], fov: 42 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 6, 4]} intensity={1.4} />
      <directionalLight position={[-4, 2, -2]} intensity={0.5} color="#8b5cf6" />

      <Book position={[-1.9, 1.15, 0]} rotation={[0.2, 0.6, -0.15]} color="#8b5cf6" />
      <Book position={[-1.35, -1.2, 0.4]} rotation={[-0.1, 1.1, 0.1]} color="#2dd4bf" scale={0.85} />
      <Book position={[1.75, -0.5, -0.3]} rotation={[0.25, -0.7, 0.1]} color="#f59e0b" scale={0.9} />

      <Laptop position={[-0.35, 0.35, 0.15]} />
      <VideoScreen position={[1.45, 1.25, -0.1]} />

      <Person position={[-1.5, 0.15, -0.5]} color="#0d9488" />
      <Person position={[0.75, -1.15, 0.3]} color="#6d28d9" />

      <CourseCard position={[1.05, 0.1, 0.6]} rotation={[0.1, -0.5, 0]} color="#6d28d9" />
      <CourseCard position={[-0.8, 1.45, 0.3]} rotation={[0.15, 0.4, 0.05]} color="#0d9488" />
      <CourseCard position={[1.9, -1.35, -0.4]} rotation={[-0.1, -1, 0]} color="#f59e0b" />

      <FloatingParticles />
      <CameraRig />
      <RenderWhileVisible />
    </Canvas>
  );
}
