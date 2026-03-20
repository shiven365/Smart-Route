import React from 'react';
import { Activity, Car, Clock } from 'lucide-react';

export const MapOverlay = ({ isRunning, isVehicleAnimating, currentStep, result, vehiclePosition }) => {
  return (
    <>
      {isRunning && (
        <div className="absolute left-4 top-4 rounded-2xl border border-blue-400/40 bg-slate-900/85 px-4 py-2 text-sm text-slate-200 shadow-lg backdrop-blur-sm z-[1000]">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 animate-pulse text-blue-300" />
            <span>Exploring: {currentStep}/{result?.steps?.length || 0}</span>
          </div>
        </div>
      )}

      {isVehicleAnimating && (
        <div className="absolute left-4 top-20 rounded-2xl border border-emerald-400/40 bg-slate-900/85 px-4 py-2 text-sm text-slate-200 shadow-lg backdrop-blur-sm z-[1000]">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-emerald-300" />
            <span>Driving: {vehiclePosition.toFixed(1)} / {(result?.path.length - 1 || 0).toFixed(1)}</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 rounded-2xl border border-slate-600/80 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 shadow-lg backdrop-blur-sm z-[1000]">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-cyan-300" />
          <span>{result ? `${result.time.toFixed(1)} ms` : 'Run algorithm to measure'}</span>
        </div>
      </div>
    </>
  );
};
