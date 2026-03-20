import React from 'react';
import { TrendingUp } from 'lucide-react';

export const MetricsPanel = ({ result }) => {
  if (!result) return null;

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-800/55 p-4">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-cyan-300" />
        <h3 className="text-sm font-semibold text-slate-100">Live Metrics</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-slate-900/70 p-2">
          <p className="text-[11px] text-slate-400">Algorithm</p>
          <p className="font-semibold text-cyan-300">{result.algorithm.toUpperCase()}</p>
        </div>
        <div className="rounded-lg bg-slate-900/70 p-2">
          <p className="text-[11px] text-slate-400">Time</p>
          <p className="font-semibold text-slate-100">{result.time.toFixed(2)} ms</p>
        </div>
        <div className="rounded-lg bg-slate-900/70 p-2">
          <p className="text-[11px] text-slate-400">Explored</p>
          <p className="font-semibold text-slate-100">{result.explored.length}</p>
        </div>
        <div className="rounded-lg bg-slate-900/70 p-2">
          <p className="text-[11px] text-slate-400">Path Nodes</p>
          <p className="font-semibold text-slate-100">{result.path.length}</p>
        </div>
        <div className="col-span-2 rounded-lg bg-slate-900/70 p-2">
          <p className="text-[11px] text-slate-400">Distance</p>
          <p className="font-semibold text-emerald-300">{result.distance.toFixed(3)} km</p>
        </div>
      </div>
    </div>
  );
};
