import React, { useState } from 'react';
import { PatternPiece2D, FabricProperties } from '../types';
import { PATTERN_PIECES_CATALOG, FABRIC_LIBRARY } from '../data/fitEngine';
import {
  Scissors,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Info,
  CheckCircle2,
  Compass,
  FileCode,
} from 'lucide-react';

interface PatternWindow2DProps {
  category: string;
  selectedColor: string;
  selectedSize: string;
}

export const PatternWindow2D: React.FC<PatternWindow2DProps> = ({
  category,
  selectedColor,
  selectedSize,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [showNotches, setShowNotches] = useState<boolean>(true);
  const [showGrainlines, setShowGrainlines] = useState<boolean>(true);

  // Retrieve patterns for category (fallback to Dress)
  const patternPieces: PatternPiece2D[] =
    PATTERN_PIECES_CATALOG[category] || PATTERN_PIECES_CATALOG['Dress'] || [];

  const fabricSpec: FabricProperties =
    FABRIC_LIBRARY[category] || FABRIC_LIBRARY['Dress'];

  const selectedPiece =
    patternPieces.find((p) => p.id === selectedPieceId) || patternPieces[0];

  return (
    <div className="bg-[#030712] border border-cyan-900/50 rounded-3xl p-4 sm:p-5 flex flex-col h-full shadow-2xl relative overflow-hidden select-none">
      {/* Blueprint Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-900/40">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-950/80 border border-cyan-500/40 rounded-xl text-cyan-400">
            <Scissors className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-mono text-white tracking-wide">
                2D PATTERN CUTTING WINDOW
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950 border border-purple-500/40 text-purple-300">
                CLO3D CAD SPEC
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Vector pattern grading for size {selectedSize} • {patternPieces.length} pattern panels
            </p>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] font-mono text-slate-300 px-1 font-bold">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1.0)}
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
            title="Reset Zoom"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <div className="w-[1px] h-4 bg-slate-700 mx-1" />
          <button
            onClick={() => setShowNotches(!showNotches)}
            className={`px-2 py-1 text-[10px] font-mono rounded-lg transition ${
              showNotches
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Notches
          </button>
          <button
            onClick={() => setShowGrainlines(!showGrainlines)}
            className={`px-2 py-1 text-[10px] font-mono rounded-lg transition ${
              showGrainlines
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Grain
          </button>
        </div>
      </div>

      {/* Main Pattern Blueprint Canvas */}
      <div className="flex-1 min-h-[380px] bg-[#020617] border border-cyan-950/60 rounded-2xl my-3 p-4 relative overflow-auto flex items-center justify-center">
        {/* Engineering Background Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage: `
              linear-gradient(to right, #0891b2 1px, transparent 1px),
              linear-gradient(to bottom, #0891b2 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Pattern Pieces Layout Grid */}
        <div
          className="flex flex-wrap items-center justify-center gap-6 relative z-10 transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {patternPieces.map((piece) => {
            const isSelected = selectedPiece?.id === piece.id;

            return (
              <div
                key={piece.id}
                onClick={() => setSelectedPieceId(piece.id)}
                className={`relative cursor-pointer transition-all p-3 rounded-2xl border flex flex-col items-center ${
                  isSelected
                    ? 'bg-cyan-950/30 border-cyan-400 shadow-xl shadow-cyan-500/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-cyan-800/80 hover:bg-slate-900/40'
                }`}
              >
                {/* Piece Title Tag */}
                <div className="flex items-center justify-between w-full mb-1 px-1">
                  <span className="text-[11px] font-mono font-bold text-slate-200 truncate max-w-[160px]">
                    {piece.name}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60">
                    {piece.widthCm}×{piece.heightCm} cm
                  </span>
                </div>

                {/* SVG Blueprint */}
                <svg
                  viewBox={piece.viewBox}
                  className="w-44 h-64 overflow-visible filter drop-shadow-[0_4px_12px_rgba(6,182,212,0.15)]"
                >
                  <defs>
                    <linearGradient id={`grad-${piece.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={selectedColor} stopOpacity={isSelected ? '0.28' : '0.12'} />
                      <stop offset="100%" stopColor={selectedColor} stopOpacity={isSelected ? '0.45' : '0.22'} />
                    </linearGradient>
                  </defs>

                  {/* Outer Seam Allowance / Cut Line */}
                  <path
                    d={piece.path}
                    fill={`url(#grad-${piece.id})`}
                    stroke={isSelected ? '#22d3ee' : '#38bdf8'}
                    strokeWidth={isSelected ? '3' : '2'}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {/* Inner Sewing Line (1cm seam allowance dashed) */}
                  <path
                    d={piece.path}
                    fill="none"
                    stroke={isSelected ? '#a855f7' : '#64748b'}
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                    transform="scale(0.96) translate(6, 6)"
                  />

                  {/* Internal Darts */}
                  {piece.darts?.map((dart, idx) => (
                    <line
                      key={idx}
                      x1={dart.x1}
                      y1={dart.y1}
                      x2={dart.x2}
                      y2={dart.y2}
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                    />
                  ))}

                  {/* Grain Line Arrow */}
                  {showGrainlines && (
                    <g transform="translate(150, 200)">
                      <line x1="0" y1="-45" x2="0" y2="45" stroke="#ec4899" strokeWidth="2" />
                      <polygon points="-4,-40 0,-48 4,-40" fill="#ec4899" />
                      <polygon points="-4,40 0,48 4,40" fill="#ec4899" />
                      <text x="6" y="4" fill="#ec4899" fontSize="10" fontFamily="monospace">
                        GRAIN
                      </text>
                    </g>
                  )}

                  {/* Seam Notches */}
                  {showNotches &&
                    piece.seamNotches.map((notch, idx) => (
                      <g key={idx} transform={`translate(${notch.x}, ${notch.y})`}>
                        <circle r="4" fill="#10b981" />
                        <line x1="-6" y1="0" x2="6" y2="0" stroke="#10b981" strokeWidth="1.5" />
                        <text
                          x="8"
                          y="3"
                          fill="#34d399"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {notch.label}
                        </text>
                      </g>
                    ))}
                </svg>

                {/* Active Indicator */}
                {isSelected && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-mono text-cyan-300 font-bold bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-500/40">
                    <CheckCircle2 className="h-3 w-3 text-cyan-400" /> SELECTED
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CLO3D Physical Fabric Properties Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl text-xs font-mono">
        <div>
          <span className="text-[10px] text-slate-400 block uppercase">Fabric Quality:</span>
          <span className="font-bold text-cyan-300 truncate block">{fabricSpec.name}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block uppercase">Weight / GSM:</span>
          <span className="font-bold text-white">{fabricSpec.gsm} g/m²</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block uppercase">Warp / Weft Stretch:</span>
          <span className="font-bold text-purple-300">
            {fabricSpec.warpStretch}% / {fabricSpec.weftStretch}%
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block uppercase">Drape Coeff / Bending:</span>
          <span className="font-bold text-emerald-400">
            {fabricSpec.drapeCoefficient}% ({fabricSpec.bendingRigidity} gf·cm)
          </span>
        </div>
      </div>
    </div>
  );
};

