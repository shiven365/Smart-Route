import React from 'react';

export const MapLegend = ({ graphLength, renderedBackgroundNodeCount }) => {
  return (
    <div className="border-b border-slate-700/60 bg-slate-900/70 px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1 text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            Start (Single Click)
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1 text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            End (Double Click)
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1 text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
            Explored
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1 text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Route
          </span>
        </div>
        <div className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
          {graphLength > 0 ? `${graphLength.toLocaleString()} nodes | ${renderedBackgroundNodeCount.toLocaleString()} rendered` : 'Loading graph...'}
        </div>
      </div>
    </div>
  );
};
