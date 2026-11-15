import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const GarmentPlatform: React.FC = () => {
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * 0.15;
    }
  });

  return (
    <group position={[0, -1.18, 0]}>
      {/* Primary Pedestal Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.35, 0.05, 64]} />
        <meshStandardMaterial
          color="#090d16"
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Outer Cyan Glowing Ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[1.22, 1.28, 64]} />
        <meshBasicMaterial
          color="#06b6d4"
          side={THREE.DoubleSide}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Inner Rotating Dashed Technical Ring */}
      <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <ringGeometry args={[0.95, 0.98, 32]} />
        <meshBasicMaterial
          color="#a855f7"
          side={THREE.DoubleSide}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Center Soft Radial Light Beam */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.9, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Subtle Cyan Spotlight from Base */}
      <pointLight position={[0, 0.2, 0]} color="#06b6d4" intensity={2.0} distance={2.5} />
    </group>
  );
};
