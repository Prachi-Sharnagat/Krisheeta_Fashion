import React from 'react';
import { RotateCw, Eye, ZoomIn, ZoomOut, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface ViewerControlsProps {
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onFrontView: () => void;
  onBackView: () => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPrevGarment?: () => void;
  onNextGarment?: () => void;
  currentIndex?: number;
  totalGarments?: number;
}

export const ViewerControls: React.FC<ViewerControlsProps> = ({
  autoRotate,
  onToggleAutoRotate,
  onFrontView,
  onBackView,
  onResetView,
  onZoomIn,
  onZoomOut,
  onPrevGarment,
  onNextGarment,
  currentIndex = 0,
  totalGarments = 1,
}) => {
  return (
    <div className="bg-slate-950/80 backdrop-blur-md border border-cyan-900/40 rounded-2xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3">
      {/* View Presets & Auto Rotate */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onToggleAutoRotate}
          aria-label="Toggle auto rotation"
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
            autoRotate
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-md shadow-cyan-500/30 animate-pulse'
              : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-slate-700/80'
          }`}
        >
          <RotateCw className={`h-3.5 w-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
          AUTO ROTATE
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5 hidden sm:block" />

        <button
          onClick={onFrontView}
          aria-label="View garment from front"
          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 hover:text-cyan-300"
        >
          <Eye className="h-3.5 w-3.5 text-cyan-400" /> FRONT
        </button>

        <button
          onClick={onBackView}
          aria-label="View garment from back"
          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 hover:text-cyan-300"
        >
          <Eye className="h-3.5 w-3.5 text-cyan-400" /> BACK
        </button>

        <button
          onClick={onResetView}
          aria-label="Reset 3D view"
          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 hover:text-cyan-300"
        >
          <RefreshCw className="h-3.5 w-3.5 text-cyan-400" /> RESET
        </button>
      </div>

      {/* Zoom Controls & Index Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={onZoomIn}
            title="Zoom In"
            aria-label="Zoom camera in"
            className="p-1.5 text-slate-300 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            aria-label="Zoom camera out"
            className="p-1.5 text-slate-300 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
        </div>

        {totalGarments > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold text-cyan-400">
            {onPrevGarment && (
              <button
                onClick={onPrevGarment}
                aria-label="Previous garment"
                className="hover:text-white transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <span>
              {String(currentIndex + 1).padStart(2, '0')} / {String(totalGarments).padStart(2, '0')}
            </span>
            {onNextGarment && (
              <button
                onClick={onNextGarment}
                aria-label="Next garment"
                className="hover:text-white transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
