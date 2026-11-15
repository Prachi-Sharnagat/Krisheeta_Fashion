import React from 'react';
import { Html } from '@react-three/drei';
import { Loader2 } from 'lucide-react';

export const ModelLoader: React.FC = () => {
  return (
    <Html center>
      <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-cyan-300">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
        <div className="text-xs font-mono font-semibold tracking-wider uppercase">
          Loading 3D Garment Model...
        </div>
      </div>
    </Html>
  );
};
