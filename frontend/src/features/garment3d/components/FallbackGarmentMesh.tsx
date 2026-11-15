import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ViewMode } from '../types';

interface FallbackGarmentMeshProps {
  color?: string;
  scale?: number;
  viewMode?: ViewMode;
}

export const FallbackGarmentMesh: React.FC<FallbackGarmentMeshProps> = ({
  color = '#06b6d4',
  scale = 1.0,
  viewMode = 'TECHNICAL',
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Subtle floating animation for visual polish
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 1.5) * 0.04 - 0.2;
    }
  });

  const parsedColor = new THREE.Color(color);
  const isWireframe = viewMode === 'TECHNICAL';

  return (
    <group ref={groupRef} scale={[scale, scale, scale]} position={[0, 0, 0]}>
      {/* Main Body / Torso */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.7, 0.75, 1.8, 24]} />
        <meshStandardMaterial
          color={parsedColor}
          emissive={isWireframe ? parsedColor.clone().multiplyScalar(0.6) : new THREE.Color('#000000')}
          emissiveIntensity={isWireframe ? 0.7 : 0}
          wireframe={isWireframe}
          roughness={0.4}
          metalness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Shoulders */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.72, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial
          color={parsedColor}
          emissive={isWireframe ? parsedColor.clone().multiplyScalar(0.6) : new THREE.Color('#000000')}
          emissiveIntensity={isWireframe ? 0.7 : 0}
          wireframe={isWireframe}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>

      {/* Left Sleeve */}
      <mesh position={[-0.85, 0.65, 0]} rotation={[0, 0, Math.PI * 0.15]}>
        <cylinderGeometry args={[0.26, 0.32, 0.7, 16]} />
        <meshStandardMaterial
          color={parsedColor}
          emissive={isWireframe ? parsedColor.clone().multiplyScalar(0.6) : new THREE.Color('#000000')}
          emissiveIntensity={isWireframe ? 0.7 : 0}
          wireframe={isWireframe}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>

      {/* Right Sleeve */}
      <mesh position={[0.85, 0.65, 0]} rotation={[0, 0, -Math.PI * 0.15]}>
        <cylinderGeometry args={[0.26, 0.32, 0.7, 16]} />
        <meshStandardMaterial
          color={parsedColor}
          emissive={isWireframe ? parsedColor.clone().multiplyScalar(0.6) : new THREE.Color('#000000')}
          emissiveIntensity={isWireframe ? 0.7 : 0}
          wireframe={isWireframe}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>

      {/* Collar Accent */}
      <mesh position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.05, 16, 24]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={0.8}
          wireframe={isWireframe}
        />
      </mesh>
    </group>
  );
};
