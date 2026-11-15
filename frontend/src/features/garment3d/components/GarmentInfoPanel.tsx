import React from 'react';
import {
  ProductWith3D,
  VariantData,
  ViewMode,
  SizeRecommendation,
  StudioLayoutMode,
  FitZone,
} from '../types';
import {
  Palette,
  Layers,
  Tag,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Box,
  Ruler,
  CheckCircle2,
  AlertCircle,
  Activity,
  Scissors,
  SplitSquareVertical,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface GarmentInfoPanelProps {
  product: ProductWith3D | null;
  selectedColor: string;
  onSelectColor: (color: string) => void;
  selectedSize: string;
  onSelectSize: (size: string) => void;
  selectedVariant: VariantData | null;
  onSelectVariant: (variant: VariantData) => void;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  userRole?: string;

  // New Fit Engine & Layout Props
  recommendation?: SizeRecommendation | null;
  onOpenMeasurements?: () => void;
  layoutMode?: StudioLayoutMode;
  onChangeLayoutMode?: (mode: StudioLayoutMode) => void;
  tryOnMode?: boolean;
  onToggleTryOn?: () => void;
  activeZone?: FitZone | null;
  onSelectZone?: (zone: FitZone) => void;
}

const PRESET_COLORS = [
  { name: 'Electric Cyan', value: '#06b6d4' },
  { name: 'Royal Indigo', value: '#3b82f6' },
  { name: 'Deep Navy', value: '#1e3a8a' },
  { name: 'Pure White', value: '#f8fafc' },
  { name: 'Crimson Red', value: '#dc2626' },
  { name: 'Neon Purple', value: '#a855f7' },
  { name: 'Forest Emerald', value: '#10b981' },
  { name: 'Onyx Dark', value: '#0f172a' },
];

const PRESET_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export const GarmentInfoPanel: React.FC<GarmentInfoPanelProps> = ({
  product,
  selectedColor,
  onSelectColor,
  selectedSize,
  onSelectSize,
  selectedVariant,
  onSelectVariant,
  viewMode,
  onToggleViewMode,
  userRole,

  recommendation,
  onOpenMeasurements,
  layoutMode = '3D_VIEW',
  onChangeLayoutMode,
  tryOnMode = true,
  onToggleTryOn,
  activeZone,
  onSelectZone,
}) => {
  if (!product) {
    return (
      <div className="bg-slate-950/80 backdrop-blur-md rounded-3xl border border-cyan-900/40 p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
        <Layers className="h-10 w-10 text-cyan-500/50 mb-3 animate-pulse" />
        <h3 className="text-base font-semibold text-slate-300">No Garment Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Select a garment category or item to inspect 3D properties.</p>
      </div>
    );
  }

  const isModelConfigured = !!product.product3dModel;

  return (
    <div className="bg-slate-950/90 backdrop-blur-md rounded-3xl border border-cyan-900/40 p-5 sm:p-6 flex flex-col gap-4 shadow-2xl text-slate-100">
      {/* Header Info */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
            {product.category || 'Apparel'}
          </span>
          <span className="text-xs font-mono text-cyan-400/80">SKU: {product.sku || 'N/A'}</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">{product.name}</h2>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
          {product.description || 'Enterprise Garment Manufacturing Spec'}
        </p>
      </div>

      <hr className="border-cyan-900/30" />

      {/* CLO3D Layout Mode Selector (3D View vs Dual Split vs 2D Pattern) */}
      {onChangeLayoutMode && (
        <div>
          <label className="block text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <SplitSquareVertical className="h-3.5 w-3.5 text-cyan-400" /> Studio Workspace Mode
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => onChangeLayoutMode('3D_VIEW')}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold transition flex items-center justify-center gap-1 ${
                layoutMode === '3D_VIEW'
                  ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3D View
            </button>
            <button
              onClick={() => onChangeLayoutMode('DUAL_CLO3D')}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold transition flex items-center justify-center gap-1 ${
                layoutMode === 'DUAL_CLO3D'
                  ? 'bg-purple-950 border border-purple-400 text-purple-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dual Split
            </button>
            <button
              onClick={() => onChangeLayoutMode('2D_PATTERN')}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold transition flex items-center justify-center gap-1 ${
                layoutMode === '2D_PATTERN'
                  ? 'bg-blue-950 border border-blue-400 text-blue-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2D Pattern
            </button>
          </div>
        </div>
      )}

      {/* GRIZAS Virtual Fit Recommendation Box (Matching image 3) */}
      {tryOnMode && recommendation && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 p-4 rounded-2xl border border-cyan-600/40 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold block">
                Virtual Try-On Analysis
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-300 font-mono">BEST OPTION:</span>
                <span className="text-xl font-black font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  {recommendation.bestSize}
                </span>
              </div>
            </div>

            {onOpenMeasurements && (
              <button
                onClick={onOpenMeasurements}
                className="px-2.5 py-1 text-[11px] font-mono font-bold text-cyan-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-cyan-700/60 rounded-xl transition flex items-center gap-1 shadow"
              >
                <Ruler className="h-3 w-3 text-cyan-400" />
                Edit Measurements
              </button>
            )}
          </div>

          {/* Ease evaluation by zone */}
          <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
            {(['bust', 'waist', 'hips'] as FitZone[]).map((zone) => {
              const evalInfo = recommendation.evaluations[zone];
              if (!evalInfo) return null;

              const isOpt = evalInfo.status === 'OPTIMAL';
              const isSnug = evalInfo.status === 'SNUG';
              const isTight = evalInfo.status === 'TIGHT';

              const colorClass = isOpt
                ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/50'
                : isSnug
                ? 'text-amber-400 border-amber-500/40 bg-amber-950/50'
                : isTight
                ? 'text-rose-400 border-rose-500/40 bg-rose-950/50'
                : 'text-cyan-400 border-cyan-500/40 bg-cyan-950/50';

              return (
                <div
                  key={zone}
                  onClick={() => onSelectZone?.(zone)}
                  className={`p-1.5 rounded-xl border text-[10px] cursor-pointer transition ${colorClass} ${
                    activeZone === zone ? 'ring-2 ring-cyan-400' : ''
                  }`}
                >
                  <span className="uppercase font-bold block">{zone}</span>
                  <span className="font-semibold block truncate">
                    {evalInfo.easeCm > 0 ? `+${evalInfo.easeCm}` : evalInfo.easeCm}cm
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Size Selector with Grizas Fit Indicator */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-cyan-400" /> Garment Size
          </label>
          {recommendation && (
            <span className="text-[10px] font-mono text-slate-400">
              Selected: <strong className="text-cyan-300">{selectedSize}</strong> (
              {recommendation.sizeBreakdown[selectedSize]?.label})
            </span>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2">
          {PRESET_SIZES.map((sz) => {
            const isBest = recommendation?.bestSize === sz;
            const isSelected = selectedSize === sz;

            return (
              <button
                key={sz}
                onClick={() => onSelectSize(sz)}
                className={`py-2 text-xs font-mono font-bold rounded-xl border transition relative flex items-center justify-center gap-1 ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {sz}
                {isBest && (
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900"
                    title="Best Option"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Swatches */}
      <div>
        <label className="block text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Palette className="h-4 w-4 text-cyan-400" /> Material Color Palette
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onSelectColor(c.value)}
              title={c.name}
              className={`w-7 h-7 rounded-full border-2 transition-transform transform hover:scale-110 flex items-center justify-center ${
                selectedColor.toLowerCase() === c.value.toLowerCase()
                  ? 'border-cyan-400 ring-2 ring-cyan-400/40 scale-110 shadow-lg'
                  : 'border-slate-700 shadow-sm'
              }`}
              style={{ backgroundColor: c.value }}
            >
              {selectedColor.toLowerCase() === c.value.toLowerCase() && (
                <span className={`w-1.5 h-1.5 rounded-full ${c.value === '#f8fafc' ? 'bg-slate-900' : 'bg-white'}`} />
              )}
            </button>
          ))}

          {/* Custom Color Input */}
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => onSelectColor(e.target.value)}
            className="w-7 h-7 p-0.5 rounded-full border border-slate-700 cursor-pointer bg-slate-900"
            title="Choose custom color"
          />
        </div>
      </div>

      {/* ERP Product Variant Selector */}
      {product.variants && product.variants.length > 0 && (
        <div>
          <label className="block text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-cyan-400" /> ERP Product Variant
          </label>
          <select
            value={selectedVariant?.id || ''}
            onChange={(e) => {
              const found = product.variants?.find((v) => v.id === e.target.value);
              if (found) onSelectVariant(found);
            }}
            className="w-full text-xs font-mono font-medium text-slate-200 bg-slate-900 border border-slate-800 rounded-xl p-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          >
            {product.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.color || 'Default'} / {v.size || 'M'}) - Stock: {v.finishedGoodsStock ?? 0}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Technical Spec Table */}
      <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1.5 text-xs font-mono">
        <div className="flex justify-between text-slate-400">
          <span>Garment Category:</span>
          <span className="font-bold text-cyan-300">{product.category || 'General'}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Warehouse Stock:</span>
          <span className="font-bold text-emerald-400">{product.finishedGoodsStock ?? 0} units</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Material Hex:</span>
          <span className="font-bold text-purple-300">{selectedColor}</span>
        </div>
      </div>

      {/* Admin Link */}
      {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
        <Link
          to="/3d-garment/manage"
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-cyan-800/50 text-cyan-300 text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-2 transition"
        >
          <Box className="h-4 w-4 text-cyan-400" />
          MANAGE 3D MODELS CATALOGUE
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
};
