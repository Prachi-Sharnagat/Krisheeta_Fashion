import React, { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FallbackGarmentMesh } from './FallbackGarmentMesh';
import { ViewMode } from '../types';

interface GarmentModelProps {
  modelUrl?: string | null;
  color?: string;
  scale?: number;
  viewMode?: ViewMode;
  onError?: () => void;
}

const GLTFModelInner: React.FC<{
  modelUrl: string;
  color?: string;
  scale?: number;
  viewMode?: ViewMode;
}> = ({ modelUrl, color = '#06b6d4', scale = 1.0, viewMode = 'TECHNICAL' }) => {
  const { scene } = useGLTF(modelUrl);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<THREE.Group>(null);

  // Compute bounding box to automatically center and scale the garment
  const { normalizedScale, centerY, minY } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    // Target height around 1.8 units
    const targetScale = maxDim > 0 ? (1.85 / maxDim) * scale : scale;

    return {
      normalizedScale: targetScale,
      centerY: center.y,
      minY: box.min.y,
    };
  }, [clonedScene, scale]);

  useEffect(() => {
    if (!clonedScene) return;

    const targetColor = new THREE.Color(color);

    clonedScene.traverse((child: any) => {
      if (child.isMesh) {
        // Backup original materials if needed
        if (!child.userData.origMaterial) {
          child.userData.origMaterial = Array.isArray(child.material)
            ? child.material.map((m: THREE.Material) => m.clone())
            : child.material.clone();
        }

        if (viewMode === 'TECHNICAL') {
          // Technical Glowing Wireframe Mode
          child.material = new THREE.MeshStandardMaterial({
            color: targetColor,
            emissive: targetColor.clone().multiplyScalar(0.7),
            emissiveIntensity: 0.6,
            wireframe: true,
            roughness: 0.2,
            metalness: 0.8,
            side: THREE.DoubleSide,
          });
        } else {
          // Realistic View Mode
          const mat = new THREE.MeshStandardMaterial({
            color: targetColor,
            roughness: 0.4,
            metalness: 0.1,
            side: THREE.DoubleSide,
          });
          child.material = mat;
        }
      }
    });
  }, [clonedScene, color, viewMode]);

  // Position group so bottom of model sits cleanly above platform y = -1.15
  const positionY = -1.15 - minY * normalizedScale;

  return (
    <group ref={groupRef} position={[0, positionY, 0]} scale={[normalizedScale, normalizedScale, normalizedScale]}>
      <primitive object={clonedScene} position={[-clonedScene.position.x, 0, -clonedScene.position.z]} />
    </group>
  );
};

export const GarmentModel: React.FC<GarmentModelProps> = ({
  modelUrl,
  color = '#06b6d4',
  scale = 1.0,
  viewMode = 'TECHNICAL',
  onError,
}) => {
  if (!modelUrl || modelUrl.trim() === '') {
    return <FallbackGarmentMesh color={color} scale={scale} viewMode={viewMode} />;
  }

  try {
    return (
      <GLTFModelInner
        modelUrl={modelUrl}
        color={color}
        scale={scale}
        viewMode={viewMode}
      />
    );
  } catch (err) {
    console.error('Failed to render GLTF model:', err);
    if (onError) onError();
    return <FallbackGarmentMesh color={color} scale={scale} viewMode={viewMode} />;
  }
};
