import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AvatarMeasurements, AvatarStyle, AvatarPose, SizeRecommendation, FitZone } from '../types';

interface HumanAvatarProps {
  measurements: AvatarMeasurements;
  style?: AvatarStyle;
  pose?: AvatarPose;
  showFitBands?: boolean;
  fitRecommendation?: SizeRecommendation | null;
  activeZone?: FitZone | null;
  onSelectZone?: (zone: FitZone) => void;
}

export const HumanAvatar: React.FC<HumanAvatarProps> = ({
  measurements,
  style = 'MANNEQUIN',
  pose = 'A_POSE',
  showFitBands = true,
  fitRecommendation,
  activeZone = null,
  onSelectZone,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<number>(0);

  // Compute parametric scale factors relative to standard base (Height: 172cm, Bust: 88cm, Waist: 68cm, Hips: 94cm, Shoulders: 40cm)
  const heightScale = measurements.height / 172;
  const bustScale = measurements.bust / 88;
  const waistScale = measurements.waist / 68;
  const hipsScale = measurements.hips / 94;
  const shoulderScale = measurements.shoulders / 40;

  // Material setup based on Avatar style
  const avatarMaterial = useMemo(() => {
    if (style === 'WIREFRAME') {
      return new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0284c7',
        emissiveIntensity: 0.5,
        wireframe: true,
      });
    }

    if (style === 'NATURAL') {
      return new THREE.MeshStandardMaterial({
        color: '#d4a373',
        roughness: 0.65,
        metalness: 0.05,
      });
    }

    // Default: CLO3D / Grizas High-End Mannequin Matte White/Pearl
    return new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.35,
      metalness: 0.12,
    });
  }, [style]);

  // Joint & accent material
  const jointMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: style === 'NATURAL' ? '#c58f60' : '#cbd5e1',
      roughness: 0.4,
      metalness: 0.2,
    });
  }, [style]);

  // Color helper for fit bands
  const getZoneColor = (zone: FitZone): THREE.Color => {
    if (!fitRecommendation) return new THREE.Color('#10b981');
    const status = fitRecommendation.evaluations[zone]?.status || 'OPTIMAL';
    switch (status) {
      case 'TIGHT':
        return new THREE.Color('#ef4444'); // Crimson
      case 'SNUG':
        return new THREE.Color('#f59e0b'); // Amber
      case 'LOOSE':
        return new THREE.Color('#06b6d4'); // Cyan
      case 'OPTIMAL':
      default:
        return new THREE.Color('#10b981'); // Emerald
    }
  };

  // Subtle breathing / idle motion for realistic posture
  useFrame((state) => {
    pulseRef.current = Math.sin(state.clock.getElapsedTime() * 2.5) * 0.15 + 0.85;
    if (groupRef.current) {
      groupRef.current.position.y = -1.15;
    }
  });

  const armAngle = pose === 'T_POSE' ? Math.PI * 0.48 : Math.PI * 0.12;

  // Fit Band radius computations in avatar local coordinate space
  const bustRadius = 0.27 * bustScale;
  const waistRadius = 0.21 * waistScale;
  const hipsRadius = 0.29 * hipsScale;

  return (
    <group ref={groupRef} scale={[heightScale, heightScale, heightScale]}>
      {/* ----------------- HEAD & NECK ----------------- */}
      {/* Head */}
      <mesh position={[0, 1.82, 0.02]} material={avatarMaterial}>
        <sphereGeometry args={[0.13, 32, 24]} />
      </mesh>
      {/* Face contour / jawline */}
      <mesh position={[0, 1.76, 0.05]} material={avatarMaterial}>
        <cylinderGeometry args={[0.09, 0.065, 0.12, 24]} />
      </mesh>
      {/* Hair contour (minimalist fashion bun / cap) */}
      <mesh position={[0, 1.87, -0.06]} material={jointMaterial}>
        <sphereGeometry args={[0.07, 24, 16]} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.64, 0]} material={avatarMaterial}>
        <cylinderGeometry args={[0.068, 0.082, 0.16, 24]} />
      </mesh>

      {/* ----------------- UPPER TORSO (CHEST / BUST) ----------------- */}
      <group position={[0, 1.42, 0]} scale={[shoulderScale, 1, 1]}>
        {/* Clavicle / Shoulders bar */}
        <mesh position={[0, 0.08, 0]} material={avatarMaterial}>
          <boxGeometry args={[0.48, 0.08, 0.18]} />
        </mesh>
        {/* Chest / Torso Upper */}
        <mesh position={[0, -0.06, 0]} scale={[bustScale / shoulderScale, 1, bustScale]}>
          <cylinderGeometry args={[0.24, 0.22, 0.24, 32]} />
        </mesh>
        {/* Bust Curves */}
        <mesh position={[-0.095, -0.06, 0.11]} scale={[bustScale, bustScale, bustScale]}>
          <sphereGeometry args={[0.095, 24, 18]} />
        </mesh>
        <mesh position={[0.095, -0.06, 0.11]} scale={[bustScale, bustScale, bustScale]}>
          <sphereGeometry args={[0.095, 24, 18]} />
        </mesh>
      </group>

      {/* ----------------- MID TORSO (WAIST / ABDOMEN) ----------------- */}
      <group position={[0, 1.18, 0]}>
        <mesh scale={[waistScale, 1, waistScale]} material={avatarMaterial}>
          <cylinderGeometry args={[0.22, 0.19, 0.24, 32]} />
        </mesh>
      </group>

      {/* ----------------- LOWER TORSO (HIPS & PELVIS) ----------------- */}
      <group position={[0, 0.94, 0]}>
        <mesh scale={[hipsScale, 1, hipsScale]} material={avatarMaterial}>
          <cylinderGeometry args={[0.2, 0.26, 0.24, 32]} />
        </mesh>
        {/* Gluteal curve */}
        <mesh position={[0, -0.04, -0.05]} scale={[hipsScale, 1, hipsScale]} material={avatarMaterial}>
          <sphereGeometry args={[0.24, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        </mesh>
      </group>

      {/* ----------------- ARMS (LEFT & RIGHT) ----------------- */}
      {/* Left Shoulder & Arm */}
      <group position={[-0.26 * shoulderScale, 1.48, 0]} rotation={[0, 0, armAngle]}>
        <mesh material={jointMaterial}>
          <sphereGeometry args={[0.065, 20, 16]} />
        </mesh>
        {/* Upper Arm */}
        <mesh position={[0, -0.22, 0]} material={avatarMaterial}>
          <cylinderGeometry args={[0.055, 0.048, 0.36, 20]} />
        </mesh>
        {/* Elbow Joint */}
        <mesh position={[0, -0.42, 0]} material={jointMaterial}>
          <sphereGeometry args={[0.048, 16, 12]} />
        </mesh>
        {/* Forearm */}
        <mesh position={[0, -0.62, 0]} material={avatarMaterial}>
          <cylinderGeometry args={[0.046, 0.038, 0.34, 20]} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.83, 0]} material={avatarMaterial}>
          <boxGeometry args={[0.035, 0.12, 0.065]} />
        </mesh>
      </group>

      {/* Right Shoulder & Arm */}
      <group position={[0.26 * shoulderScale, 1.48, 0]} rotation={[0, 0, -armAngle]}>
        <mesh material={jointMaterial}>
          <sphereGeometry args={[0.065, 20, 16]} />
        </mesh>
        {/* Upper Arm */}
        <mesh position={[0, -0.22, 0]} material={avatarMaterial}>
          <cylinderGeometry args={[0.055, 0.048, 0.36, 20]} />
        </mesh>
        {/* Elbow Joint */}
        <mesh position={[0, -0.42, 0]} material={jointMaterial}>
          <sphereGeometry args={[0.048, 16, 12]} />
        </mesh>
        {/* Forearm */}
        <mesh position={[0, -0.62, 0]} material={avatarMaterial}>
          <cylinderGeometry args={[0.046, 0.038, 0.34, 20]} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.83, 0]} material={avatarMaterial}>
          <boxGeometry args={[0.035, 0.12, 0.065]} />
        </mesh>
      </group>

      {/* ----------------- LEGS (LEFT & RIGHT) ----------------- */}
      {/* Left Leg */}
      <group position={[-0.12 * hipsScale, 0.82, 0]}>
        <mesh material={jointMaterial}>
          <sphereGeometry args={[0.075, 20, 16]} />
        </mesh>
        {/* Thigh */}
        <mesh position={[0, -0.26, 0]} material={avatarMaterial}>
          <cylinderGeometry args={[0.088, 0.066, 0.44, 24]} />
        </mesh>
        {/* Knee */}
        <mesh position={[0, -0.5, 0.01]} material={jointMaterial}>
          <sphereGeometry args={[0.062, 18, 14]} />
        </mesh>
        {/* Calf */}
        <mesh position={[0, -0.74, -0.01]} material={avatarMaterial}>
          <cylinderGeometry args={[0.062, 0.046, 0.42, 24]} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, -0.98, 0.06]} material={avatarMaterial}>
          <boxGeometry args={[0.07, 0.06, 0.19]} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group position={[0.12 * hipsScale, 0.82, 0]}>
        <mesh material={jointMaterial}>
          <sphereGeometry args={[0.075, 20, 16]} />
        </mesh>
        {/* Thigh */}
        <mesh position={[0, -0.26, 0]} material={avatarMaterial}>
          <cylinderGeometry args={[0.088, 0.066, 0.44, 24]} />
        </mesh>
        {/* Knee */}
        <mesh position={[0, -0.5, 0.01]} material={jointMaterial}>
          <sphereGeometry args={[0.062, 18, 14]} />
        </mesh>
        {/* Calf */}
        <mesh position={[0, -0.74, -0.01]} material={avatarMaterial}>
          <cylinderGeometry args={[0.062, 0.046, 0.42, 24]} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, -0.98, 0.06]} material={avatarMaterial}>
          <boxGeometry args={[0.07, 0.06, 0.19]} />
        </mesh>
      </group>

      {/* ----------------- INTERACTIVE FIT EVALUATION BANDS (CLO3D / GRIZAS) ----------------- */}
      {showFitBands && (
        <group>
          {/* 1. BUST FIT BAND */}
          <group
            position={[0, 1.36, 0.02]}
            rotation={[Math.PI / 2, 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectZone?.('bust');
            }}
          >
            <mesh>
              <torusGeometry args={[bustRadius, 0.012, 16, 48]} />
              <meshStandardMaterial
                color={getZoneColor('bust')}
                emissive={getZoneColor('bust')}
                emissiveIntensity={activeZone === 'bust' ? 1.6 : 0.85}
                roughness={0.2}
              />
            </mesh>
          </group>

          {/* 2. WAIST FIT BAND */}
          <group
            position={[0, 1.15, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectZone?.('waist');
            }}
          >
            <mesh>
              <torusGeometry args={[waistRadius, 0.011, 16, 48]} />
              <meshStandardMaterial
                color={getZoneColor('waist')}
                emissive={getZoneColor('waist')}
                emissiveIntensity={activeZone === 'waist' ? 1.6 : 0.85}
                roughness={0.2}
              />
            </mesh>
          </group>

          {/* 3. HIPS FIT BAND */}
          <group
            position={[0, 0.92, -0.01]}
            rotation={[Math.PI / 2, 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectZone?.('hips');
            }}
          >
            <mesh>
              <torusGeometry args={[hipsRadius, 0.012, 16, 48]} />
              <meshStandardMaterial
                color={getZoneColor('hips')}
                emissive={getZoneColor('hips')}
                emissiveIntensity={activeZone === 'hips' ? 1.6 : 0.85}
                roughness={0.2}
              />
            </mesh>
          </group>

          {/* 4. SHOULDERS LINE */}
          <group
            position={[0, 1.52, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectZone?.('shoulders');
            }}
          >
            <mesh>
              <boxGeometry args={[0.54 * shoulderScale, 0.012, 0.012]} />
              <meshStandardMaterial
                color={getZoneColor('shoulders')}
                emissive={getZoneColor('shoulders')}
                emissiveIntensity={activeZone === 'shoulders' ? 1.6 : 0.85}
              />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};

