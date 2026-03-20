import React, { useState, useRef } from 'react';

import { Sidebar } from './components/Sidebar';
import { MapLegend } from './components/MapLegend';
import { MapOverlay } from './components/MapOverlay';

import { useMapInit } from './hooks/useMapInit';
import { useAlgorithms } from './hooks/useAlgorithms';
import { useVehicle } from './hooks/useVehicle';
import { useMapOverlays } from './hooks/useMapOverlays';

const SmartRoute360 = () => {
  // 1. Core State
  const [startNode, setStartNode] = useState({ lat: 23.0225, lng: 72.5714 });
  const [endNode, setEndNode] = useState({ lat: 23.05, lng: 72.60 });
  const [mapStyle, setMapStyle] = useState('streets');
  const [speed, setSpeed] = useState(50);
  const [blockedNodes, setBlockedNodes] = useState([]);
  
  const [vehiclePosition, setVehiclePosition] = useState(0);
  const [isVehicleAnimating, setIsVehicleAnimating] = useState(false);

  // 2. Shared Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const graphRef = useRef([]);
  const nodeByIdRef = useRef(new Map());
  const hasFittedPathRef = useRef(false);
  
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const vehicleAnimationRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const vehicleTrailRef = useRef(null);

  // 3. Map Initialization Hook
  const { graph, graphEdgeCount } = useMapInit(
    mapContainerRef, mapRef, graphRef, nodeByIdRef,
    mapStyle, setStartNode, setEndNode, setBlockedNodes
  );

  // 4. Algorithms Hook
  const {
    algorithm, setAlgorithm,
    heuristicWeight, setHeuristicWeight,
    trafficWeight, setTrafficWeight,
    isRunning, setIsRunning,
    isPaused, setIsPaused,
    currentStep, setCurrentStep,
    result, setResult,
    multiAlgorithms, setMultiAlgorithms,
    multiResults, setMultiResults,
    comparisonResults, setComparisonResults,
    showStats, setShowStats,
    runAlgorithm, runMultipleAlgorithms, compareAlgorithms, reset
  } = useAlgorithms(
    graph, startNode, endNode, blockedNodes, nodeByIdRef, hasFittedPathRef,
    speed, vehicleAnimationRef, vehicleMarkerRef, vehicleTrailRef,
    markersRef, polylinesRef,
    setVehiclePosition, setIsVehicleAnimating
  );

  // 5. Vehicle Animation Hook
  const { startVehicle } = useVehicle(
    mapRef, result, speed, nodeByIdRef,
    isVehicleAnimating, setIsVehicleAnimating,
    setVehiclePosition, vehicleAnimationRef, vehicleMarkerRef, vehicleTrailRef
  );

  // 6. Map Overlays Hook
  const { renderedBackgroundNodeCount } = useMapOverlays(
    mapRef, graph, startNode, endNode, result, currentStep, 
    blockedNodes, multiResults, isRunning, nodeByIdRef, hasFittedPathRef, 
    markersRef, polylinesRef
  );

  const clearBlockedNodes = () => {
    setBlockedNodes([]);
    console.log("Blocked nodes cleared");
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#061526] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-28 -left-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1920px] p-3 sm:p-4 lg:p-6">
        <div className="grid min-h-[calc(100vh-1.5rem)] grid-cols-1 gap-4 lg:grid-cols-[370px_1fr] lg:gap-5">
          <Sidebar 
            graphLength={graph.length}
            graphEdgeCount={graphEdgeCount}
            renderedBackgroundNodeCount={renderedBackgroundNodeCount}
            isVehicleAnimating={isVehicleAnimating}
            algorithm={algorithm}
            setAlgorithm={setAlgorithm}
            heuristicWeight={heuristicWeight}
            setHeuristicWeight={setHeuristicWeight}
            trafficWeight={trafficWeight}
            setTrafficWeight={setTrafficWeight}
            speed={speed}
            setSpeed={setSpeed}
            runAlgorithm={runAlgorithm}
            isRunning={isRunning}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            startVehicle={startVehicle}
            result={result}
            clearBlockedNodes={clearBlockedNodes}
            reset={reset}
          />

          <section className="flex min-h-[63vh] flex-col overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/55 shadow-2xl backdrop-blur-md lg:min-h-[calc(100vh-3.75rem)]">
            <MapLegend 
              graphLength={graph.length} 
              renderedBackgroundNodeCount={renderedBackgroundNodeCount} 
            />

            <div className="relative flex-1 bg-[#122236]">
              <div
                ref={mapContainerRef}
                className="h-[63vh] w-full lg:h-full"
                style={{ background: '#122236' }}
              />

              <MapOverlay 
                isRunning={isRunning} 
                isVehicleAnimating={isVehicleAnimating} 
                currentStep={currentStep} 
                result={result} 
                vehiclePosition={vehiclePosition} 
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SmartRoute360;