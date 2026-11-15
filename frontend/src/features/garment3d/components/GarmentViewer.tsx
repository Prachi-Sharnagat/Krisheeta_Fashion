import React, { Suspense, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { GarmentModel } from './GarmentModel';
import { FallbackGarmentMesh } from './FallbackGarmentMesh';
import { HumanAvatar } from './HumanAvatar';
import { GarmentAvatarDrape } from './GarmentAvatarDrape';
import { TechnicalGrid } from './TechnicalGrid';
import { GarmentPlatform } from './GarmentPlatform';
import { ModelLoader } from './ModelLoader';
import {
  ViewMode,
  AvatarMeasurements,
  AvatarStyle,
  AvatarPose,
  SizeRecommendation,
  FitZone,
} from '../types';
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Sparkles,
  User,
  Activity,
  Flame,
  Ruler,
  CheckCircle2,
} from 'lucide-react';

export interface GarmentViewerHandle {
  setFrontView: () => void;
  setBackView: () => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleAutoRotate: () => void;
}

interface GarmentViewerProps {
  modelUrl?: string | null;
  color?: string;
  scale?: number;
  autoRotate?: boolean;
  onToggleAutoRotate?: () => void;
  viewMode?: ViewMode;
  onToggleViewMode?: () => void;
  onPrevGarment?: () => void;
  onNextGarment?: () => void;
  currentIndex?: number;
  totalGarments?: number;
  onSelectIndex?: (idx: number) => void;
  categoryName?: string;
  productName?: string;

  // Virtual Try-On & Fit Check Props
  tryOnMode?: boolean;
  onToggleTryOn?: () => void;
  showFitBands?: boolean;
  onToggleFitBands?: () => void;
  tensionHeatmap?: boolean;
  onToggleTensionHeatmap?: () => void;
  measurements?: AvatarMeasurements;
  avatarStyle?: AvatarStyle;
  avatarPose?: AvatarPose;
  fitRecommendation?: SizeRecommendation | null;
  selectedSize?: string;
  activeZone?: FitZone | null;
  onSelectZone?: (zone: FitZone) => void;
  onOpenMeasurements?: () => void;
}

export const GarmentViewer = forwardRef<GarmentViewerHandle, GarmentViewerProps>(
  (
    {
      modelUrl,
      color = '#06b6d4',
      scale = 1.0,
      autoRotate = false,
      onToggleAutoRotate,
      viewMode = 'TECHNICAL',
      onToggleViewMode,
      onPrevGarment,
      onNextGarment,
      currentIndex = 0,
      totalGarments = 1,
      onSelectIndex,
      categoryName = 'Garment',
      productName,

      tryOnMode = true,
      onToggleTryOn,
      showFitBands = true,
      onToggleFitBands,
      tensionHeatmap = false,
      onToggleTensionHeatmap,
      measurements = {
        height: 172,
        bust: 88,
        waist: 68,
        hips: 94,
        shoulders: 40,
        inseam: 78,
      },
      avatarStyle = 'MANNEQUIN',
      avatarPose = 'A_POSE',
      fitRecommendation = null,
      selectedSize = 'M',
      activeZone = null,
      onSelectZone,
      onOpenMeasurements,
    },
    ref
  ) => {
    const controlsRef = useRef<OrbitControlsImpl>(null);
    const [hasLoadError, setHasLoadError] = useState(false);
    const [showDragHint, setShowDragHint] = useState(true);

    // Reset load error when modelUrl changes
    useEffect(() => {
      setHasLoadError(false);
    }, [modelUrl]);

    // Fade out drag hint after 4 seconds
    useEffect(() => {
      const timer = setTimeout(() => setShowDragHint(false), 4500);
      return () => clearTimeout(timer);
    }, []);

    useImperativeHandle(ref, () => ({
      setFrontView: () => {
        if (controlsRef.current) {
          controlsRef.current.setAzimuthalAngle(0);
          controlsRef.current.setPolarAngle(Math.PI / 2);
          controlsRef.current.object.position.set(0, 0, 4.2);
          controlsRef.current.target.set(0, -0.1, 0);
          controlsRef.current.update();
        }
      },
      setBackView: () => {
        if (controlsRef.current) {
          controlsRef.current.setAzimuthalAngle(Math.PI);
          controlsRef.current.setPolarAngle(Math.PI / 2);
          controlsRef.current.object.position.set(0, 0, -4.2);
          controlsRef.current.target.set(0, -0.1, 0);
          controlsRef.current.update();
        }
      },
      resetView: () => {
        if (controlsRef.current) {
          controlsRef.current.reset();
          controlsRef.current.setAzimuthalAngle(0);
          controlsRef.current.setPolarAngle(Math.PI / 2);
          controlsRef.current.object.position.set(0, 0, 4.2);
          controlsRef.current.target.set(0, -0.1, 0);
          controlsRef.current.update();
        }
      },
      zoomIn: () => {
        if (controlsRef.current) {
          const cam = controlsRef.current.object;
          cam.position.multiplyScalar(0.85);
          controlsRef.current.update();
        }
      },
      zoomOut: () => {
        if (controlsRef.current) {
          const cam = controlsRef.current.object;
          cam.position.multiplyScalar(1.15);
          controlsRef.current.update();
        }
      },
      toggleAutoRotate: () => {
        if (onToggleAutoRotate) onToggleAutoRotate();
      },
    }));

    return (
      <div className="relative w-full h-[520px] md:h-[620px] bg-gradient-to-b from-slate-950 via-[#070c1b] to-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-cyan-900/50 group select-none">
        {/* Subtle Technical Grid Background Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.08] pointer-events-none" />

        {/* Futuristic Corner Brackets */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none" />

        {/* TOP HUD BAR */}
        <div className="absolute top-4 left-5 right-5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
          {/* Top-Left: Mode & Category Tag */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-300 shadow-md backdrop-blur">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              {tryOnMode ? 'AVATAR TRY-ON' : '3D VIEW'}
            </span>
            {categoryName && (
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/50 text-[11px] font-semibold text-slate-300 backdrop-blur">
                {categoryName}
              </span>
            )}
            {/* Best Option Chip (Grizas style matching image 3) */}
            {tryOnMode && fitRecommendation && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-[11px] font-mono font-bold text-emerald-300 backdrop-blur shadow flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                BEST: SIZE {fitRecommendation.bestSize}
              </span>
            )}
          </div>

          {/* Top-Right: Quick Toolbar (Try-On, Fit Bands, Heatmap, Edit Measurements) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Avatar Try-On Toggle */}
            {onToggleTryOn && (
              <button
                onClick={onToggleTryOn}
                className={`px-3 py-1 rounded-full text-[11px] font-mono font-semibold transition backdrop-blur border flex items-center gap-1.5 shadow ${
                  tryOnMode
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                    : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-white'
                }`}
                title="Toggle Avatar Try-On vs Garment Only"
              >
                <User className="h-3 w-3" />
                {tryOnMode ? 'Avatar On' : 'Garment Only'}
              </button>
            )}

            {/* Fit Bands Toggle */}
            {tryOnMode && onToggleFitBands && (
              <button
                onClick={onToggleFitBands}
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold transition backdrop-blur border flex items-center gap-1 shadow ${
                  showFitBands
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                    : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-white'
                }`}
                title="Toggle Grizas Fit Check Bands"
              >
                <Activity className="h-3 w-3" />
                Fit Bands
              </button>
            )}

            {/* Tension Heatmap Toggle */}
            {tryOnMode && onToggleTensionHeatmap && (
              <button
                onClick={onToggleTensionHeatmap}
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold transition backdrop-blur border flex items-center gap-1 shadow ${
                  tensionHeatmap
                    ? 'bg-rose-950 border-rose-400 text-rose-300'
                    : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-white'
                }`}
                title="Toggle CLO3D Tension & Stress Heatmap"
              >
                <Flame className="h-3 w-3" />
                Heatmap
              </button>
            )}

            {/* Edit Measurements Button (Grizas style) */}
            {tryOnMode && onOpenMeasurements && (
              <button
                onClick={onOpenMeasurements}
                className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 border border-cyan-400/50 flex items-center gap-1.5 transition"
                title="Edit Avatar Body Measurements"
              >
                <Ruler className="h-3 w-3" />
                Measurements
              </button>
            )}

            {/* View Mode Toggle (Technical vs Realistic) */}
            {onToggleViewMode && (
              <button
                onClick={onToggleViewMode}
                className={`px-3 py-1 rounded-full text-[11px] font-mono font-semibold transition backdrop-blur border flex items-center gap-1.5 ${
                  viewMode === 'TECHNICAL'
                    ? 'bg-purple-950/80 border-purple-500/50 text-purple-300 hover:bg-purple-900/80'
                    : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/80'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                {viewMode === 'TECHNICAL' ? 'TECHNICAL' : 'REALISTIC'}
              </button>
            )}
          </div>
        </div>

        {/* Temporary Drag Hint Overlay */}
        {showDragHint && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-slate-950/80 border border-cyan-500/30 px-4 py-1.5 rounded-full text-xs font-mono font-medium text-cyan-300 tracking-wider shadow-xl backdrop-blur transition-opacity duration-700 pointer-events-none flex items-center gap-2">
            <RotateCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
            DRAG TO ROTATE 360°
          </div>
        )}

        {/* Left Circular Previous Garment Arrow Button */}
        {onPrevGarment && totalGarments > 1 && (
          <button
            onClick={onPrevGarment}
            aria-label="Rotate to previous garment"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-cyan-950 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 flex items-center justify-center shadow-lg transition backdrop-blur hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Right Circular Next Garment Arrow Button */}
        {onNextGarment && totalGarments > 1 && (
          <button
            onClick={onNextGarment}
            aria-label="Rotate to next garment"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-cyan-950 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 flex items-center justify-center shadow-lg transition backdrop-blur hover:scale-110 active:scale-95"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Three.js Canvas */}
        <Canvas
          camera={{ position: [0, 0, 4.2], fov: 45 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onPointerDown={() => setShowDragHint(false)}
        >
          <color attach="background" args={['#050814']} />

          {/* Studio Lighting Setup with Cyan Rim Light */}
          <ambientLight intensity={0.85} />
          <directionalLight position={[5, 8, 5]} intensity={1.4} castShadow />
          <directionalLight position={[-5, 4, -5]} intensity={0.7} />
          <pointLight position={[0, 3, -4]} color="#06b6d4" intensity={2.2} distance={8} />

          {/* Futuristic Environment */}
          <TechnicalGrid />
          <GarmentPlatform />

          {/* Camera Orbit Controls */}
          <OrbitControls
            ref={controlsRef}
            autoRotate={autoRotate}
            autoRotateSpeed={2.8}
            enablePan={false}
            enableZoom={true}
            enableDamping={true}
            dampingFactor={0.05}
            minPolarAngle={Math.PI * 0.15}
            maxPolarAngle={Math.PI * 0.85}
            minDistance={1.8}
            maxDistance={7.5}
            target={[0, -0.1, 0]}
          />

          {/* 3D Simulation Elements */}
          <Suspense fallback={<ModelLoader />}>
            {tryOnMode ? (
              // 1. AVATAR TRY-ON & FIT CHECK MODE (CLO3D / GRIZAS)
              <group>
                <HumanAvatar
                  measurements={measurements}
                  style={avatarStyle}
                  pose={avatarPose}
                  showFitBands={showFitBands}
                  fitRecommendation={fitRecommendation}
                  activeZone={activeZone}
                  onSelectZone={onSelectZone}
                />
                <GarmentAvatarDrape
                  category={categoryName}
                  size={selectedSize}
                  color={color}
                  viewMode={viewMode}
                  measurements={measurements}
                  tensionHeatmap={tensionHeatmap}
                  fitRecommendation={fitRecommendation}
                />
              </group>
            ) : (
              // 2. GARMENT-ONLY 3D CAD MODEL MODE
              <group>
                {!hasLoadError && modelUrl ? (
                  <GarmentModel
                    modelUrl={modelUrl}
                    color={color}
                    scale={scale}
                    viewMode={viewMode}
                    onError={() => setHasLoadError(true)}
                  />
                ) : (
                  <FallbackGarmentMesh color={color} scale={scale} viewMode={viewMode} />
                )}
              </group>
            )}
          </Suspense>
        </Canvas>

        {/* Bottom Center Pagination Dots */}
        {totalGarments > 0 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-slate-950/70 border border-slate-800/80 px-3.5 py-1.5 rounded-full backdrop-blur">
            {Array.from({ length: totalGarments }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => onSelectIndex && onSelectIndex(idx)}
                aria-label={`Select garment ${idx + 1}`}
                className={`transition-all rounded-full ${
                  idx === currentIndex
                    ? 'w-3 h-3 bg-cyan-400 shadow-md shadow-cyan-400/50 scale-110'
                    : 'w-2 h-2 bg-slate-600 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        )}

        {/* Bottom Right 360° Indicator */}
        <div className="absolute bottom-4 right-5 z-10 flex items-center gap-1.5 bg-slate-950/80 border border-cyan-500/30 px-3 py-1 rounded-full text-xs font-mono font-semibold text-cyan-300 backdrop-blur shadow">
          <RotateCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
          360°
        </div>
      </div>
    );
  }
);

GarmentViewer.displayName = 'GarmentViewer';
