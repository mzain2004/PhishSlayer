"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment } from "@react-three/drei";
import * as THREE from "three";

/* ───────────────────────────────────────────────────────────
   Multi-layered Shield Mesh
   - Outer shell: matte black titanium chassis
   - Inner panel: refractive spatial glass
   - Core: amethyst crystal with pulsating energy bloom
   ─────────────────────────────────────────────────────────── */

function ShieldChassis() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  // Shield shape — refined pentagon silhouette
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.5);
  shape.lineTo(1.15, 0.75);
  shape.quadraticCurveTo(1.15, -0.85, 0, -1.5);
  shape.quadraticCurveTo(-1.15, -0.85, -1.15, 0.75);
  shape.lineTo(0, 1.5);

  const extrudeSettings = {
    depth: 0.35,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.08,
    bevelSegments: 12,
  };

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.3}>
      <group>
        {/* Outer titanium chassis */}
        <mesh ref={meshRef} scale={1.25}>
          <extrudeGeometry args={[shape, extrudeSettings]} />
          <meshStandardMaterial
            color="#1a1a1a"
            roughness={0.7}
            metalness={0.95}
          />
        </mesh>

        {/* Gold conduit ring */}
        <mesh ref={meshRef} scale={1.05} position={[0, 0, 0.05]}>
          <extrudeGeometry args={[shape, { ...extrudeSettings, depth: 0.08, bevelThickness: 0.02, bevelSize: 0.02 }]} />
          <meshStandardMaterial
            color="#b8860b"
            roughness={0.25}
            metalness={1}
            emissive="#8B6914"
            emissiveIntensity={0.15}
          />
        </mesh>

        {/* Spatial glass panel */}
        <mesh scale={0.85} position={[0, 0, 0.15]}>
          <extrudeGeometry args={[shape, { ...extrudeSettings, depth: 0.12, bevelThickness: 0.03, bevelSize: 0.03 }]} />
          <meshPhysicalMaterial
            color="#0d9488"
            roughness={0.05}
            metalness={0.1}
            transmission={0.6}
            thickness={0.5}
            ior={1.5}
            transparent
            opacity={0.4}
          />
        </mesh>

        {/* Amethyst crystal core */}
        <mesh scale={0.45} position={[0, 0, 0.25]}>
          <icosahedronGeometry args={[1, 2]} />
          <meshPhysicalMaterial
            color="#7c3aed"
            roughness={0.1}
            metalness={0.3}
            transmission={0.3}
            thickness={1}
            ior={2.0}
            emissive="#7c3aed"
            emissiveIntensity={0.8}
          />
        </mesh>
      </group>
    </Float>
  );
}

/* Pulsating energy bloom around the core */
function EnergyBloom() {
  const bloomRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (bloomRef.current) {
      const pulse = Math.sin(clock.getElapsedTime() * 2) * 0.3 + 0.7;
      bloomRef.current.intensity = pulse;
    }
  });

  return (
    <pointLight
      ref={bloomRef}
      position={[0, 0, 1.5]}
      color="#7c3aed"
      intensity={0.7}
      distance={6}
      decay={2}
    />
  );
}

export default function HeroShield3D() {
  return (
    <div className="w-full h-[350px] lg:h-[450px]">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
        <pointLight position={[-3, 2, 4]} intensity={0.3} color="#2dd4bf" />
        <EnergyBloom />
        <ShieldChassis />
      </Canvas>
    </div>
  );
}
