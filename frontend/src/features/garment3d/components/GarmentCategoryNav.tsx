import React from 'react';
import { GARMENT_CATEGORIES } from '../data/garment3d';
import { GarmentCategoryKey } from '../types';
import { Shirt, Scissors, Crown, Compass, Layers, Sparkles, HardHat, Grid } from 'lucide-react';

interface GarmentCategoryNavProps {
  selectedCategory: GarmentCategoryKey;
  onSelectCategory: (category: GarmentCategoryKey) => void;
  countsPerCategory: Record<string, number>;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Grid: <Grid className="h-4 w-4" />,
  Sparkles: <Sparkles className="h-4 w-4" />,
  Shirt: <Shirt className="h-4 w-4" />,
  Scissors: <Scissors className="h-4 w-4" />,
  Crown: <Crown className="h-4 w-4" />,
  Compass: <Compass className="h-4 w-4" />,
  Layers: <Layers className="h-4 w-4" />,
  HardHat: <HardHat className="h-4 w-4" />,
};

export const GarmentCategoryNav: React.FC<GarmentCategoryNavProps> = ({
  selectedCategory,
  onSelectCategory,
  countsPerCategory,
}) => {
  return (
    <div className="w-full md:w-52 shrink-0 bg-slate-950/80 backdrop-blur-md border border-cyan-900/40 rounded-2xl p-3 shadow-2xl shadow-cyan-950/20">
      <div className="flex items-center justify-between px-2 mb-3">
        <h3 className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Garments
        </h3>
        <span className="text-[10px] font-mono text-slate-400">RAIL v2</span>
      </div>

      {/* Categories container: Horizontal on mobile, Vertical list on desktop */}
      <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 scrollbar-none">
        {GARMENT_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.key;
          const count = countsPerCategory[cat.key] ?? 0;

          return (
            <button
              key={cat.key}
              onClick={() => onSelectCategory(cat.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 md:shrink border text-left group ${
                isSelected
                  ? 'bg-gradient-to-r from-cyan-950/80 via-indigo-950/90 to-purple-950/80 border-cyan-500/60 text-cyan-200 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-900/50 hover:bg-slate-900/90 border-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                    : 'bg-slate-800/80 text-slate-400 group-hover:text-cyan-400'
                }`}
              >
                {ICON_MAP[cat.iconName] || <Shirt className="h-4 w-4" />}
              </div>

              <span className="flex-1 whitespace-nowrap font-medium">{cat.label}</span>

              {count > 0 && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
