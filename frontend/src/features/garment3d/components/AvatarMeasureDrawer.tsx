import React from 'react';
import {
  AvatarMeasurements,
  AvatarProfile,
  AvatarStyle,
  AvatarPose,
  SizeRecommendation,
  FitZone,
} from '../types';
import { AVATAR_PROFILES } from '../data/fitEngine';
import {
  User,
  Sliders,
  Sparkles,
  Check,
  ShieldCheck,
  RotateCcw,
  Ruler,
  AlertCircle,
  HelpCircle,
  X,
} from 'lucide-react';

interface AvatarMeasureDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  measurements: AvatarMeasurements;
  onChangeMeasurements: (m: AvatarMeasurements) => void;
  avatarProfile: AvatarProfile;
  onSelectProfile: (p: AvatarProfile) => void;
  avatarStyle: AvatarStyle;
  onChangeStyle: (s: AvatarStyle) => void;
  avatarPose: AvatarPose;
  onChangePose: (p: AvatarPose) => void;
  recommendation: SizeRecommendation | null;
  selectedSize: string;
  onSelectSize: (s: string) => void;
  activeZone: FitZone | null;
  onSelectZone: (zone: FitZone) => void;
}

export const AvatarMeasureDrawer: React.FC<AvatarMeasureDrawerProps> = ({
  isOpen,
  onClose,
  measurements,
  onChangeMeasurements,
  avatarProfile,
  onSelectProfile,
  avatarStyle,
  onChangeStyle,
  avatarPose,
  onChangePose,
  recommendation,
  selectedSize,
  onSelectSize,
  activeZone,
  onSelectZone,
}) => {
  if (!isOpen) return null;

  const handleSliderChange = (key: keyof AvatarMeasurements, value: number) => {
    onChangeMeasurements({
      ...measurements,
      [key]: value,
    });
  };

  const getStatusBadge = (zone: FitZone) => {
    if (!recommendation) return null;
    const evalData = recommendation.evaluations[zone];
    if (!evalData) return null;

    const bgMap = {
      OPTIMAL: 'bg-emerald-950 text-emerald-300 border-emerald-500/50',
      SNUG: 'bg-amber-950 text-amber-300 border-amber-500/50',
      TIGHT: 'bg-rose-950 text-rose-300 border-rose-500/50',
      LOOSE: 'bg-cyan-950 text-cyan-300 border-cyan-500/50',
    };

    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
          bgMap[evalData.status]
        }`}
      >
        {evalData.statusText} ({evalData.easeCm > 0 ? `+${evalData.easeCm}` : evalData.easeCm}cm ease)
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0b1120] border border-cyan-800/60 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-cyan-950 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Ruler className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                AVATAR FIT & MEASUREMENT ENGINE
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  GRIZAS / CLO3D SYNC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Parametric human avatar configuration and real-time garment ease analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Best Option Header Card (Matching Image 3) */}
          {recommendation && (
            <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-emerald-950/60 p-4 rounded-2xl border border-cyan-700/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 block font-bold">
                  Fit Analysis & Recommendation
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-sm text-slate-300">BEST OPTION:</span>
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    SIZE {recommendation.bestSize}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{recommendation.summary}</p>
              </div>

              {/* Quick Size Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shrink-0">
                {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => {
                  const isBest = recommendation.bestSize === sz;
                  const isSelected = selectedSize === sz;
                  return (
                    <button
                      key={sz}
                      onClick={() => onSelectSize(sz)}
                      className={`relative px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {sz}
                      {isBest && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Body Profile Presets */}
          <div>
            <label className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <User className="h-4 w-4 text-cyan-400" /> Body Profile Silhouette
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(AVATAR_PROFILES) as AvatarProfile[]).map((profKey) => {
                const prof = AVATAR_PROFILES[profKey];
                const isSelected = avatarProfile === profKey;

                return (
                  <button
                    key={profKey}
                    onClick={() => {
                      onSelectProfile(profKey);
                      onChangeMeasurements({
                        height: prof.height,
                        bust: prof.bust,
                        waist: prof.waist,
                        hips: prof.hips,
                        shoulders: prof.shoulders,
                        inseam: prof.inseam,
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono truncate">{prof.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                      {prof.bust} / {prof.waist} / {prof.hips} cm
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parametric Measurement Sliders */}
          <div className="space-y-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-cyan-400" /> Parametric Dimensions (cm)
              </span>
              <button
                onClick={() => {
                  const def = AVATAR_PROFILES['STANDARD'];
                  onChangeMeasurements({
                    height: def.height,
                    bust: def.bust,
                    waist: def.waist,
                    hips: def.hips,
                    shoulders: def.shoulders,
                    inseam: def.inseam,
                  });
                }}
                className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Reset Standard
              </button>
            </div>

            {/* Height Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Height</span>
                <span className="font-bold text-cyan-300">{measurements.height} cm</span>
              </div>
              <input
                type="range"
                min={150}
                max={195}
                value={measurements.height}
                onChange={(e) => handleSliderChange('height', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Bust Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-mono mb-1">
                <span className="text-slate-300 flex items-center gap-2">
                  Bust / Chest Circumference
                  {getStatusBadge('bust')}
                </span>
                <span className="font-bold text-cyan-300">{measurements.bust} cm</span>
              </div>
              <input
                type="range"
                min={75}
                max={125}
                value={measurements.bust}
                onChange={(e) => handleSliderChange('bust', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Waist Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-mono mb-1">
                <span className="text-slate-300 flex items-center gap-2">
                  Waist Circumference
                  {getStatusBadge('waist')}
                </span>
                <span className="font-bold text-cyan-300">{measurements.waist} cm</span>
              </div>
              <input
                type="range"
                min={55}
                max={110}
                value={measurements.waist}
                onChange={(e) => handleSliderChange('waist', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Hips Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-mono mb-1">
                <span className="text-slate-300 flex items-center gap-2">
                  Hips / Seat Circumference
                  {getStatusBadge('hips')}
                </span>
                <span className="font-bold text-cyan-300">{measurements.hips} cm</span>
              </div>
              <input
                type="range"
                min={80}
                max={130}
                value={measurements.hips}
                onChange={(e) => handleSliderChange('hips', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Shoulders Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-mono mb-1">
                <span className="text-slate-300 flex items-center gap-2">
                  Shoulder Breadth
                  {getStatusBadge('shoulders')}
                </span>
                <span className="font-bold text-cyan-300">{measurements.shoulders} cm</span>
              </div>
              <input
                type="range"
                min={34}
                max={52}
                value={measurements.shoulders}
                onChange={(e) => handleSliderChange('shoulders', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* Avatar Finish & Pose */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                Avatar Appearance
              </label>
              <div className="flex gap-2">
                {[
                  { key: 'MANNEQUIN', label: 'Mannequin' },
                  { key: 'NATURAL', label: 'Natural Skin' },
                  { key: 'WIREFRAME', label: 'Wireframe' },
                ].map((st) => (
                  <button
                    key={st.key}
                    onClick={() => onChangeStyle(st.key as AvatarStyle)}
                    className={`flex-1 py-1.5 text-[11px] font-mono font-bold rounded-xl border transition ${
                      avatarStyle === st.key
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                Avatar Pose
              </label>
              <div className="flex gap-2">
                {[
                  { key: 'A_POSE', label: 'A-Pose (45°)' },
                  { key: 'T_POSE', label: 'T-Pose (90°)' },
                ].map((pos) => (
                  <button
                    key={pos.key}
                    onClick={() => onChangePose(pos.key as AvatarPose)}
                    className={`flex-1 py-1.5 text-[11px] font-mono font-bold rounded-xl border transition ${
                      avatarPose === pos.key
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-cyan-950/80 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition"
          >
            Apply & Inspect Try-On
          </button>
        </div>
      </div>
    </div>
  );
};

