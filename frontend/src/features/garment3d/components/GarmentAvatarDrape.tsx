import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AvatarMeasurements, ViewMode, SizeRecommendation, FitZone } from '../types';

interface GarmentAvatarDrapeProps {
  category: string;
  size: string;
  color: string;
  viewMode: ViewMode;
  measurements: AvatarMeasurements;
  tensionHeatmap?: boolean;
  fitRecommendation?: SizeRecommendation | null;
}

export const GarmentAvatarDrape: React.FC<GarmentAvatarDrapeProps> = ({
  category,
  size,
  color,
  viewMode,
  measurements,
  tensionHeatmap = false,
  fitRecommendation,
}) => {
  const drapeGroupRef = useRef<THREE.Group>(null);

  // Sizing scale multiplier based on standard garment grading
  const sizeMultiplier = useMemo(() => {
    switch (size) {
      case 'S':
        return 0.95;
      case 'L':
        return 1.05;
      case 'XL':
        return 1.12;
      case 'XXL':
        return 1.2;
      case 'M':
      default:
        return 1.0;
    }
  }, [size]);

  // Scaled dimensions relative to avatar
  const heightScale = measurements.height / 172;
  const bustScale = (measurements.bust / 88) * sizeMultiplier;
  const waistScale = (measurements.waist / 68) * sizeMultiplier;
  const hipsScale = (measurements.hips / 94) * sizeMultiplier;
  const shoulderScale = (measurements.shoulders / 40) * sizeMultiplier;

  // Fabric Material Creation
  const isWireframe = viewMode === 'TECHNICAL';
  const baseColor = useMemo(() => new THREE.Color(color), [color]);

  // Stress Heatmap Material calculation
  const getHeatmapColor = (zone: FitZone): THREE.Color => {
    if (!tensionHeatmap || !fitRecommendation) return baseColor;
    const status = fitRecommendation.evaluations[zone]?.status || 'OPTIMAL';
    switch (status) {
      case 'TIGHT':
        return new THREE.Color('#ef4444'); // Red: High tension
      case 'SNUG':
        return new THREE.Color('#f59e0b'); // Amber: Snug
      case 'LOOSE':
        return new THREE.Color('#06b6d4'); // Cyan: Low stress
      case 'OPTIMAL':
      default:
        return new THREE.Color('#10b981'); // Emerald: Normal
    }
  };

  const mainMaterial = useMemo(() => {
    if (tensionHeatmap && fitRecommendation) {
      // Heatmap dynamic shader material
      return new THREE.MeshStandardMaterial({
        color: getHeatmapColor('bust'),
        roughness: 0.5,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
    }

    return new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: isWireframe ? baseColor.clone().multiplyScalar(0.7) : new THREE.Color('#000000'),
      emissiveIntensity: isWireframe ? 0.75 : 0,
      wireframe: isWireframe,
      roughness: category === 'Dress' ? 0.25 : category === 'Jeans' ? 0.8 : 0.55,
      metalness: category === 'Dress' ? 0.25 : 0.05,
      side: THREE.DoubleSide,
    });
  }, [baseColor, isWireframe, tensionHeatmap, fitRecommendation, category]);

  const waistMaterial = useMemo(() => {
    if (tensionHeatmap && fitRecommendation) {
      return new THREE.MeshStandardMaterial({
        color: getHeatmapColor('waist'),
        roughness: 0.5,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
    }
    return mainMaterial;
  }, [tensionHeatmap, fitRecommendation, mainMaterial]);

  const hipMaterial = useMemo(() => {
    if (tensionHeatmap && fitRecommendation) {
      return new THREE.MeshStandardMaterial({
        color: getHeatmapColor('hips'),
        roughness: 0.5,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
    }
    return mainMaterial;
  }, [tensionHeatmap, fitRecommendation, mainMaterial]);

  // Trim & detail material (zipper, seams, stitch lines)
  const trimMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isWireframe ? '#38bdf8' : '#e2e8f0',
      metalness: 0.8,
      roughness: 0.2,
      wireframe: isWireframe,
    });
  }, [isWireframe]);

  useFrame(() => {
    if (drapeGroupRef.current) {
      drapeGroupRef.current.position.y = -1.15;
    }
  });

  return (
    <group ref={drapeGroupRef} scale={[heightScale, heightScale, heightScale]}>
      {/* ======================================================== */}
      {/* 1. DRESS DRAPING (Matches Silk Draped Dress & CLO3D Dress) */}
      {/* ======================================================== */}
      {(category === 'Dress' || category === 'ALL') && (
        <group>
          {/* Upper Bodice / Chest */}
          <mesh position={[0, 1.36, 0.02]} scale={[bustScale * 1.04, 1, bustScale * 1.05]} material={mainMaterial}>
            <cylinderGeometry args={[0.26, 0.24, 0.28, 32]} />
          </mesh>
          {/* Draped Neckline Collar */}
          <mesh position={[0, 1.5, 0.04]} rotation={[Math.PI * 0.1, 0, 0]} material={trimMaterial}>
            <torusGeometry args={[0.16, 0.015, 16, 32]} />
          </mesh>
          {/* Waist Band / Cinch */}
          <mesh position={[0, 1.16, 0]} scale={[waistScale * 1.03, 1, waistScale * 1.03]} material={waistMaterial}>
            <cylinderGeometry args={[0.24, 0.22, 0.22, 32]} />
          </mesh>
          {/* Skirt Flare (Midi/Maxi Bias Cut) */}
          <mesh position={[0, 0.65, 0]} scale={[hipsScale * 1.05, 1, hipsScale * 1.05]} material={hipMaterial}>
            <cylinderGeometry args={[0.23, 0.44, 0.82, 36, 1, true]} />
          </mesh>
          {/* Lower Ruffle / Flowing Hem */}
          <mesh position={[0, 0.23, 0]} scale={[hipsScale * 1.12, 1, hipsScale * 1.12]} material={mainMaterial}>
            <cylinderGeometry args={[0.44, 0.52, 0.16, 36, 1, true]} />
          </mesh>
        </group>
      )}

      {/* ======================================================== */}
      {/* 2. HOODIE DRAPING (Matches CLO3D Heavyweight Plush Hoodie) */}
      {/* ======================================================== */}
      {category === 'Hoodie' && (
        <group>
          {/* Oversized Torso */}
          <mesh position={[0, 1.25, 0]} scale={[bustScale * 1.14, 1, bustScale * 1.14]} material={mainMaterial}>
            <cylinderGeometry args={[0.29, 0.31, 0.52, 32]} />
          </mesh>
          {/* Kangaroo Pouch Pocket */}
          <mesh position={[0, 1.12, 0.19 * bustScale]} material={waistMaterial}>
            <boxGeometry args={[0.34, 0.18, 0.05]} />
          </mesh>
          {/* Drawstring Hood on Shoulders/Neck */}
          <mesh position={[0, 1.62, -0.06]} scale={[shoulderScale * 1.05, 1, 1]} material={mainMaterial}>
            <sphereGeometry args={[0.22, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
          </mesh>
          {/* Drawstring Rib Cords */}
          <mesh position={[-0.06, 1.34, 0.18]} material={trimMaterial}>
            <cylinderGeometry args={[0.006, 0.006, 0.22, 12]} />
          </mesh>
          <mesh position={[0.06, 1.34, 0.18]} material={trimMaterial}>
            <cylinderGeometry args={[0.006, 0.006, 0.22, 12]} />
          </mesh>
          {/* Left Oversized Sleeve */}
          <mesh position={[-0.34 * shoulderScale, 1.32, 0]} rotation={[0, 0, Math.PI * 0.14]} material={mainMaterial}>
            <cylinderGeometry args={[0.1, 0.08, 0.62, 24]} />
          </mesh>
          {/* Right Oversized Sleeve */}
          <mesh position={[0.34 * shoulderScale, 1.32, 0]} rotation={[0, 0, -Math.PI * 0.14]} material={mainMaterial}>
            <cylinderGeometry args={[0.1, 0.08, 0.62, 24]} />
          </mesh>
          {/* Ribbed Bottom Hem Band */}
          <mesh position={[0, 0.97, 0]} scale={[waistScale * 1.08, 1, waistScale * 1.08]} material={trimMaterial}>
            <cylinderGeometry args={[0.29, 0.27, 0.08, 32]} />
          </mesh>
        </group>
      )}

      {/* ======================================================== */}
      {/* 3. JEANS / JUMPSUIT / TROUSERS (Matches CLO3D Wide-Leg)  */}
      {/* ======================================================== */}
      {category === 'Jeans' && (
        <group>
          {/* High-Waisted Yoke Band */}
          <mesh position={[0, 1.06, 0]} scale={[waistScale * 1.02, 1, waistScale * 1.02]} material={waistMaterial}>
            <cylinderGeometry args={[0.22, 0.26, 0.18, 32]} />
          </mesh>
          {/* Waistband Details (Button & Loops) */}
          <mesh position={[0, 1.12, 0.12 * waistScale]} rotation={[Math.PI / 2, 0, 0]} material={trimMaterial}>
            <cylinderGeometry args={[0.012, 0.012, 0.02, 16]} />
          </mesh>
          {/* Left Wide-Leg Trousers */}
          <mesh position={[-0.13 * hipsScale, 0.48, 0]} material={hipMaterial}>
            <cylinderGeometry args={[0.14, 0.16, 1.0, 28]} />
          </mesh>
          {/* Right Wide-Leg Trousers */}
          <mesh position={[0.13 * hipsScale, 0.48, 0]} material={hipMaterial}>
            <cylinderGeometry args={[0.14, 0.16, 1.0, 28]} />
          </mesh>
          {/* Side Seam Details */}
          <mesh position={[-0.26 * hipsScale, 0.48, 0]} material={trimMaterial}>
            <boxGeometry args={[0.008, 0.98, 0.02]} />
          </mesh>
          <mesh position={[0.26 * hipsScale, 0.48, 0]} material={trimMaterial}>
            <boxGeometry args={[0.008, 0.98, 0.02]} />
          </mesh>
        </group>
      )}

      {/* ======================================================== */}
      {/* 4. T-SHIRT (Drop-Shoulder Relaxed Crewneck)              */}
      {/* ======================================================== */}
      {category === 'T-Shirt' && (
        <group>
          {/* Main Torso */}
          <mesh position={[0, 1.28, 0]} scale={[bustScale * 1.08, 1, bustScale * 1.08]} material={mainMaterial}>
            <cylinderGeometry args={[0.27, 0.26, 0.5, 32]} />
          </mesh>
          {/* Ribbed Collar */}
          <mesh position={[0, 1.54, 0.02]} rotation={[Math.PI * 0.12, 0, 0]} material={trimMaterial}>
            <torusGeometry args={[0.13, 0.014, 16, 32]} />
          </mesh>
          {/* Left Drop Sleeve */}
          <mesh position={[-0.3 * shoulderScale, 1.4, 0]} rotation={[0, 0, Math.PI * 0.16]} material={mainMaterial}>
            <cylinderGeometry args={[0.088, 0.076, 0.32, 24]} />
          </mesh>
          {/* Right Drop Sleeve */}
          <mesh position={[0.3 * shoulderScale, 1.4, 0]} rotation={[0, 0, -Math.PI * 0.16]} material={mainMaterial}>
            <cylinderGeometry args={[0.088, 0.076, 0.32, 24]} />
          </mesh>
        </group>
      )}

      {/* ======================================================== */}
      {/* 5. SHIRT & BLAZER (Tailored Collar & Placket)            */}
      {/* ======================================================== */}
      {(category === 'Shirt' || category === 'Blazer') && (
        <group>
          {/* Torso with tailored silhouette */}
          <mesh position={[0, 1.28, 0]} scale={[bustScale * 1.06, 1, bustScale * 1.06]} material={mainMaterial}>
            <cylinderGeometry args={[0.28, 0.26, 0.52, 32]} />
          </mesh>
          {/* Lapels / Collar */}
          <mesh position={[-0.08, 1.45, 0.14]} rotation={[0, 0.2, -0.2]} material={trimMaterial}>
            <boxGeometry args={[0.1, 0.22, 0.02]} />
          </mesh>
          <mesh position={[0.08, 1.45, 0.14]} rotation={[0, -0.2, 0.2]} material={trimMaterial}>
            <boxGeometry args={[0.1, 0.22, 0.02]} />
          </mesh>
          {/* Button Placket line */}
          <mesh position={[0, 1.26, 0.15 * bustScale]} material={trimMaterial}>
            <boxGeometry args={[0.024, 0.44, 0.01]} />
          </mesh>
          {/* Left Tailored Sleeve */}
          <mesh position={[-0.32 * shoulderScale, 1.34, 0]} rotation={[0, 0, Math.PI * 0.12]} material={mainMaterial}>
            <cylinderGeometry args={[0.082, 0.068, 0.58, 24]} />
          </mesh>
          {/* Right Tailored Sleeve */}
          <mesh position={[0.32 * shoulderScale, 1.34, 0]} rotation={[0, 0, -Math.PI * 0.12]} material={mainMaterial}>
            <cylinderGeometry args={[0.082, 0.068, 0.58, 24]} />
          </mesh>
        </group>
      )}
    </group>
  );
};
