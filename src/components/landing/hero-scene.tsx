"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Group, Mesh } from "three";

// 3D education ecosystem for the landing hero.
// Organized composition: a central learning stack (laptop + video screen)
// flanked symmetrically by teacher/student, with course cards orbiting a
// ground ring and books fanned on a pedestal. Low-poly primitives only.
//
// Performance safeguards: lazy-loaded (dynamic import), desktop-only
// (parent hides below lg), demand-frameloop paused offscreen, skipped
// entirely under prefers-reduced-motion.

function useReducedMotionFlag(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/* ---------------- Composition pieces ---------------- */

/** Central learning stack: laptop in front, glowing video screen behind. */
function LearningStack() {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = Math.sin(t * 0.6) * 0.1;
    group.current.rotation.y = Math.sin(t * 0.22) * 0.08;
  });
  return (
    <group ref={group} position={[0, -0.15, 0]}>
      {/* Laptop (rounded feel via metalness) */}
      <group position={[0, -0.75, 0.35]}>
        <mesh>
          <boxGeometry args={[1.15, 0.06, 0.78]} />
          <meshStandardMaterial color="#3a3a4f" roughness={0.35} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.38, -0.36]} rotation={[-0.32, 0, 0]}>
          <boxGeometry args={[1.15, 0.72, 0.035]} />
          <meshStandardMaterial color="#15152a" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.36, -0.33]} rotation={[-0.32, 0, 0]}>
          <planeGeometry args={[1.02, 0.58]} />
          <meshBasicMaterial color="#8b5cf6" />
        </mesh>
      </group>

      {/* Video screen behind with emissive glow */}
      <group position={[0, 0.45, -0.35]}>
        <mesh>
          <boxGeometry args={[1.35, 0.85, 0.05]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.3} metalness={0.45} />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[1.2, 0.7]} />
          <meshBasicMaterial color="#0d9488" />
        </mesh>
        <mesh position={[0, 0, 0.065]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.09, 0.18, 3]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Screen glow */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[1.5, 1.05]} />
          <meshBasicMaterial color="#0d9488" transparent opacity={0.16} />
        </mesh>
      </group>

      {/* Small stacked books at the laptop's side */}
      <group position={[0.85, -0.72, 0.25]} rotation={[0, 0.4, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.07, 0.36]} />
          <meshStandardMaterial color="#8b5cf6" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.075, 0]} rotation={[0, 0.15, 0]}>
          <boxGeometry args={[0.46, 0.07, 0.32]} />
          <meshStandardMaterial color="#2dd4bf" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.42, 0.07, 0.28]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.55} />
        </mesh>
      </group>
    </group>
  );
}

/** Floating graduation cap + orbiting "knowledge orb". */
function FloatingAccents() {
  const caps = useRef<Group>(null);
  const orb = useRef<Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (caps.current) {
      caps.current.rotation.y = Math.sin(t * 0.5) * 0.25;
      caps.current.position.y = Math.sin(t * 0.9) * 0.12;
    }
    if (orb.current) {
      orb.current.rotation.y += 0.004;
    }
  });
  return (
    <>
      {/* Graduation caps floating top-left / bottom-right */}
      <group ref={caps} position={[-1.7, 1.35, 0.1]}>
        <mesh rotation={[0, 0.4, 0]}>
          <boxGeometry args={[0.34, 0.04, 0.34]} />
          <meshStandardMaterial color="#101223" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.12, 16]} />
          <meshStandardMaterial color="#101223" roughness={0.4} />
        </mesh>
        <mesh position={[0.12, 0.1, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.4} />
        </mesh>
      </group>
      <group position={[1.75, -1.15, -0.3]} rotation={[0, -0.5, 0]} scale={0.8}>
        <mesh>
          <boxGeometry args={[0.34, 0.04, 0.34]} />
          <meshStandardMaterial color="#101223" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.12, 16]} />
          <meshStandardMaterial color="#101223" roughness={0.4} />
        </mesh>
        <mesh position={[0.12, 0.1, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#2dd4bf" roughness={0.4} />
        </mesh>
      </group>

      {/* Knowledge orb with ring, high above the stack */}
      <group ref={orb} position={[0, 1.55, -0.55]}>
        <mesh>
          <sphereGeometry args={[0.16, 24, 24]} />
          <meshStandardMaterial color="#8b5cf6" emissive="#6d28d9" emissiveIntensity={0.55} roughness={0.25} metalness={0.3} />
        </mesh>
        <mesh rotation={[Math.PI / 2.6, 0, 0]}>
          <torusGeometry args={[0.26, 0.008, 8, 48]} />
          <meshBasicMaterial color="#2dd4bf" transparent opacity={0.7} />
        </mesh>
      </group>
    </>
  );
}

/** Teacher (left) and student (right), mirrored, facing the center. */
function Person({
  side,
  color,
  isTeacher,
}: {
  side: 1 | -1;
  color: string;
  isTeacher: boolean;
}) {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = -0.62 + Math.sin(t * 0.7 + (side === 1 ? 0 : 2)) * 0.08;
    group.current.rotation.y = side * 0.5 + Math.sin(t * 0.4) * 0.06;
  });
  return (
    <group ref={group} position={[side * 1.35, -0.62, 0.15]} rotation={[0, side * 0.5, 0]}>
      <mesh>
        <sphereGeometry args={[0.19, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.26, 0]}>
        <cylinderGeometry args={[0.13, 0.17, 0.26, 18]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
      {isTeacher && (
        /* Graduation-cap style crown */
        <mesh position={[0, 0.21, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.03, 18]} />
          <meshStandardMaterial color="#101223" roughness={0.5} />
        </mesh>
      )}
    </group>
  );
}

/** Course cards orbiting the stack on a ring. */
function OrbitingCards() {
  const group = useRef<Group>(null);
  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y += 0.0022;
  });
  const cards = [
    { angle: 0, color: "#6d28d9", y: 0.25 },
    { angle: (Math.PI * 2) / 3, color: "#0d9488", y: 0.5 },
    { angle: (Math.PI * 4) / 3, color: "#f59e0b", y: 0.05 },
  ];
  return (
    <group ref={group}>
      {cards.map((c, i) => (
        <group
          key={i}
          position={[Math.cos(c.angle) * 1.75, c.y, Math.sin(c.angle) * 0.6]}
          rotation={[0, -c.angle, 0]}
        >
          <mesh>
            <boxGeometry args={[0.6, 0.42, 0.04]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.1, 0.025]}>
            <boxGeometry args={[0.42, 0.12, 0.01]} />
            <meshStandardMaterial color={c.color} roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.12, 0.025]}>
            <boxGeometry args={[0.34, 0.05, 0.01]} />
            <meshStandardMaterial color="#d1d5db" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Ground ring that grounds the composition. */
function GroundRing() {
  const ring = useRef<Mesh>(null);
  useFrame(() => {
    if (!ring.current) return;
    ring.current.rotation.z += 0.0015;
  });
  return (
    <mesh ref={ring} rotation={[Math.PI / 2.15, 0, 0]} position={[0, -1.15, 0]}>
      <torusGeometry args={[1.9, 0.015, 8, 64]} />
      <meshBasicMaterial color="#8b5cf6" transparent opacity={0.35} />
    </mesh>
  );
}

/** Confined ambient particles inside a shell around the stack. */
function Particles({ count = 16 }: { count?: number }) {
  const group = useRef<Group>(null);
  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y += 0.0012;
  });
  const particles = Array.from({ length: count }, (_, i) => {
    const seeded = (salt: number) => {
      const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const theta = seeded(1) * Math.PI * 2;
    const radius = 0.8 + seeded(2) * 1.4;
    return {
      pos: [
        Math.cos(theta) * radius,
        -0.8 + seeded(3) * 1.9,
        Math.sin(theta) * radius * 0.55,
      ] as [number, number, number],
      scale: 0.012 + seeded(4) * 0.03,
      color: i % 3 === 0 ? "#8b5cf6" : i % 3 === 1 ? "#2dd4bf" : "#ffffff",
    };
  });
  return (
    <group ref={group}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.pos} scale={p.scale}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color={p.color} transparent opacity={0.5} />
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
    c.position.x += (pointer.x * 0.32 - c.position.x) * 0.04;
    c.position.y += (-pointer.y * 0.22 - c.position.y) * 0.04;
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
      camera={{ position: [0, 0.05, 4.1], fov: 40 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#c7d2fe", "#0f172a", 0.7]} />
      <directionalLight position={[4, 6, 4]} intensity={1.6} />
      <directionalLight position={[-4, 2, -2]} intensity={0.5} color="#8b5cf6" />
      <directionalLight position={[0, -2, 3]} intensity={0.4} color="#2dd4bf" />

      <GroundRing />
      <LearningStack />
      <FloatingAccents />
      <Person side={-1} color="#0d9488" isTeacher />
      <Person side={1} color="#6d28d9" isTeacher={false} />
      <OrbitingCards />
      <Particles />
      <CameraRig />
      <RenderWhileVisible />
    </Canvas>
  );
}
