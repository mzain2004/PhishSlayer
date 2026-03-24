"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function ShieldMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  // Shield shape — rounded pentagon
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.4);
  shape.lineTo(1.1, 0.7);
  shape.quadraticCurveTo(1.1, -0.8, 0, -1.4);
  shape.quadraticCurveTo(-1.1, -0.8, -1.1, 0.7);
  shape.lineTo(0, 1.4);

  const extrudeSettings = {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 8,
  };

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={meshRef} scale={1.2}>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <MeshDistortMaterial
          color="#2dd4bf"
          emissive="#0d9488"
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.8}
          distort={0.1}
          speed={2}
        />
      </mesh>
    </Float>
  );
}

export default function HeroShield3D() {
  return (
    <div className="w-full h-[350px] lg:h-[450px]">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
        <pointLight position={[-3, 2, 4]} intensity={0.6} color="#2dd4bf" />
        <pointLight position={[3, -2, 2]} intensity={0.4} color="#a78bfa" />
        <ShieldMesh />
      </Canvas>
    </div>
  );
}
