import React from 'react';
import { Navigation, Zap, Settings, Play, Pause, Car, RotateCcw } from 'lucide-react';
import { MetricsPanel } from './MetricsPanel';

export const Sidebar = ({
  graphLength,
  graphEdgeCount,
  renderedBackgroundNodeCount,
  isVehicleAnimating,
  algorithm,
  setAlgorithm,
  heuristicWeight,
  setHeuristicWeight,
  trafficWeight,
  setTrafficWeight,
  speed,
  setSpeed,
  runAlgorithm,
  isRunning,
  isPaused,
  setIsPaused,
  startVehicle,
  result,
  clearBlockedNodes,
  reset
}) => {
  return (
    <aside className="overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/70 shadow-2xl backdrop-blur-md">
      <div className="max-h-[82vh] space-y-5 overflow-y-auto p-5 sm:p-6 lg:max-h-[calc(100vh-3.75rem)]">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
            <Navigation className="h-3.5 w-3.5" />
            Final Assignment Ready
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">SmartRoute360</h1>
            <p className="mt-1 text-sm text-slate-300">AI Navigation Visualizer with Realistic Vehicle Motion</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-800/55 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Nodes</p>
            <p className="mt-1 text-lg font-semibold text-cyan-300">{graphLength.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-slate-700/70 bg-slate-800/55 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Edges</p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">{graphEdgeCount.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-slate-700/70 bg-slate-800/55 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Rendered</p>
            <p className="mt-1 text-lg font-semibold text-amber-300">{renderedBackgroundNodeCount.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-slate-700/70 bg-slate-800/55 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Vehicle</p>
            <p className="mt-1 text-lg font-semibold text-violet-300">{isVehicleAnimating ? 'Driving' : 'Ready'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/55 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-300" />
            <h3 className="text-sm font-semibold text-slate-100">Algorithm Selection</h3>
          </div>
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
          >
            <option value="astar">A* (Optimal)</option>
            <option value="dijkstra">Dijkstra</option>
            <option value="bidirectional">Bidirectional Dijkstra</option>
            <option value="bfs">Breadth-First Search</option>
            <option value="greedy">Greedy Best-First</option>
            <option value="dfs">Depth-First Search</option>
          </select>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/55 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4 text-cyan-300" />
            <h3 className="text-sm font-semibold text-slate-100">Simulation Parameters</h3>
          </div>

          <div className="space-y-4">
            {(algorithm === 'astar' || algorithm === 'greedy') && (
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                  <span>Heuristic Weight</span>
                  <span>{heuristicWeight.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={heuristicWeight}
                  onChange={(e) => setHeuristicWeight(parseFloat(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700"
                />
              </div>
            )}

            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                <span>Traffic Weight</span>
                <span>{trafficWeight.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={trafficWeight}
                onChange={(e) => setTrafficWeight(parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                <span>Vehicle Speed</span>
                <span>{speed}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/55 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">Control Center</h3>
          <div className="space-y-2">
            <button
              onClick={runAlgorithm}
              disabled={isRunning || graphLength === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play className="h-4 w-4" />
              {graphLength === 0 ? 'Loading Graph...' : 'Run Algorithm'}
            </button>

            <button
              onClick={() => setIsPaused(!isPaused)}
              disabled={!isRunning}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:from-amber-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Pause className="h-4 w-4" />
              {isPaused ? 'Resume Exploration' : 'Pause Exploration'}
            </button>

            <button
              onClick={startVehicle}
              disabled={!result || isVehicleAnimating || result.path.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:from-emerald-400 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Car className="h-4 w-4" />
              Start Real Car Drive
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={clearBlockedNodes}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-rose-400 hover:text-rose-300"
              >
                Clear Blocks
              </button>
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {result && <MetricsPanel result={result} />}

        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/55 p-4 text-xs text-slate-300">
          <p className="mb-2 font-semibold text-slate-100">Map Interaction</p>
          <div className="space-y-1">
            <p>Single Click: set start point</p>
            <p>Double Click: set destination</p>
            <p>Ctrl + Click: block/unblock node</p>
            <p>Scroll: zoom, Drag: pan</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
