import { useState, useRef, useEffect, useCallback } from 'react';
import { calculatePathDistance } from '../utils/graphUtils';
import { aStarAlgorithm, dijkstraAlgorithm, bidirectionalDijkstra, bfsAlgorithm, greedyBFS, dfsAlgorithm } from '../algorithms/pathfinding';

export const useAlgorithms = (
  graph,
  startNode,
  endNode,
  blockedNodes,
  nodeByIdRef,
  hasFittedPathRef,
  speed,
  vehicleAnimationRef,
  vehicleMarkerRef,
  vehicleTrailRef,
  markersRef,
  polylinesRef,
  setVehiclePosition,
  setIsVehicleAnimating
) => {
  const [algorithm, setAlgorithm] = useState('astar');
  const [heuristicWeight, setHeuristicWeight] = useState(1);
  const [trafficWeight, setTrafficWeight] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  
  const [multiAlgorithms, setMultiAlgorithms] = useState([]);
  const [multiResults, setMultiResults] = useState([]);
  const [comparisonResults, setComparisonResults] = useState([]);
  const [showStats, setShowStats] = useState(false);

  const animationRef = useRef(null);

  // Animation loop
  useEffect(() => {
    if (isRunning && !isPaused && result && result.steps) {
      const intervalMs = Math.max(20, 120 - speed);
      animationRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= result.steps.length) {
            setIsRunning(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isRunning, isPaused, result, speed]);

  const runAlgorithm = useCallback(() => {
    if (!graph || graph.length === 0) {
      console.error("Graph not loaded yet");
      alert("Please wait for the graph to load");
      return;
    }

    console.log(`Running ${algorithm} from (${startNode.lat}, ${startNode.lng}) to (${endNode.lat}, ${endNode.lng})`);
    
    const startTime = performance.now();
    let res;
    
    switch (algorithm) {
      case 'astar':
        res = aStarAlgorithm(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, heuristicWeight, trafficWeight, blockedNodes);
        break;
      case 'dijkstra':
        res = dijkstraAlgorithm(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, trafficWeight, blockedNodes);
        break;
      case 'bidirectional':
        res = bidirectionalDijkstra(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, trafficWeight, blockedNodes);
        break;
      case 'bfs':
        res = bfsAlgorithm(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, blockedNodes);
        break;
      case 'greedy':
        res = greedyBFS(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, blockedNodes);
        break;
      case 'dfs':
        res = dfsAlgorithm(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, blockedNodes);
        break;
      default:
        res = aStarAlgorithm(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, heuristicWeight, trafficWeight, blockedNodes);
    }
    
    const endTime = performance.now();
    const distance = calculatePathDistance(res.path, nodeByIdRef.current);
    
    setResult({
      ...res,
      time: endTime - startTime,
      distance,
      algorithm
    });
    setCurrentStep(0);
    hasFittedPathRef.current = false;
    setIsRunning(true);
    setIsPaused(false);
    setIsVehicleAnimating(false);
    setVehiclePosition(0);
    setMultiResults([]);

    if (vehicleAnimationRef.current) {
      window.cancelAnimationFrame(vehicleAnimationRef.current);
      vehicleAnimationRef.current = null;
    }

    if (vehicleMarkerRef?.current) {
      vehicleMarkerRef.current.remove();
      vehicleMarkerRef.current = null;
    }

    if (vehicleTrailRef?.current) {
      vehicleTrailRef.current.remove();
      vehicleTrailRef.current = null;
    }
    
    console.log(`Algorithm completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`Path found: ${res.path.length} nodes, Distance: ${distance.toFixed(3)}km`);
  }, [
    algorithm, graph, startNode, endNode, heuristicWeight, trafficWeight, blockedNodes, nodeByIdRef,
    hasFittedPathRef, setIsVehicleAnimating, setVehiclePosition, vehicleAnimationRef, vehicleMarkerRef, vehicleTrailRef
  ]);

  const runMultipleAlgorithms = useCallback(() => {
    if (multiAlgorithms.length === 0) {
      console.warn("No algorithms selected for comparison");
      return;
    }

    if (!graph || graph.length === 0) {
      console.error("Graph not loaded yet");
      return;
    }

    console.log(`Running multiple algorithms: ${multiAlgorithms.join(', ')}`);
    
    const results = multiAlgorithms.map(alg => {
      const startTime = performance.now();
      let res;
      
      switch (alg) {
        case 'astar':
          res = aStarAlgorithm(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, heuristicWeight, trafficWeight, blockedNodes);
          break;
        case 'dijkstra':
          res = dijkstraAlgorithm(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, trafficWeight, blockedNodes);
          break;
        case 'bidirectional':
          res = bidirectionalDijkstra(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, trafficWeight, blockedNodes);
          break;
        case 'bfs':
          res = bfsAlgorithm(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, blockedNodes);
          break;
        case 'greedy':
          res = greedyBFS(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, blockedNodes);
          break;
        case 'dfs':
          res = dfsAlgorithm(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, blockedNodes);
          break;
        default:
          res = { path: [], explored: [], steps: [] };
      }
      
      const endTime = performance.now();
      const distance = calculatePathDistance(res.path, nodeByIdRef.current);
      
      return {
        ...res,
        time: endTime - startTime,
        distance,
        algorithm: alg
      };
    });
    
    setMultiResults(results);
    setResult(null);
    setCurrentStep(0);
    setIsRunning(false);
    console.log(`Multiple algorithm comparison completed: ${results.length} algorithms`);
  }, [multiAlgorithms, graph, startNode, endNode, heuristicWeight, trafficWeight, blockedNodes, nodeByIdRef]);

  const compareAlgorithms = useCallback(() => {
    if (!graph || graph.length === 0) {
      console.error("Graph not loaded yet");
      return;
    }

    console.log("Running benchmark comparison of all algorithms");
    
    const algorithms = ['astar', 'dijkstra', 'bidirectional', 'bfs', 'greedy', 'dfs'];
    const results = algorithms.map(alg => {
      const startTime = performance.now();
      let res;
      
      switch (alg) {
        case 'astar':
          res = aStarAlgorithm(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, heuristicWeight, trafficWeight, blockedNodes);
          break;
        case 'dijkstra':
          res = dijkstraAlgorithm(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, trafficWeight, blockedNodes);
          break;
        case 'bidirectional':
          res = bidirectionalDijkstra(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, trafficWeight, blockedNodes);
          break;
        case 'bfs':
          res = bfsAlgorithm(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, blockedNodes);
          break;
        case 'greedy':
          res = greedyBFS(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, blockedNodes);
          break;
        case 'dfs':
          res = dfsAlgorithm(graph, startNode.lat, startNode.lng, endNode.lat, endNode.lng, blockedNodes);
          break;
        default:
          res = { path: [], explored: [], steps: [] };
      }
      
      const endTime = performance.now();
      const distance = calculatePathDistance(res.path, nodeByIdRef.current);
      
      return {
        name: alg.toUpperCase(),
        time: parseFloat((endTime - startTime).toFixed(2)),
        explored: res.explored.length,
        pathLength: res.path.length,
        distance: parseFloat(distance.toFixed(2)),
        efficiency: res.explored.length > 0 ? parseFloat((100 * res.path.length / res.explored.length).toFixed(2)) : 0
      };
    });
    
    setComparisonResults(results);
    setShowStats(true);
    console.log("Benchmark comparison completed");
  }, [graph, startNode, endNode, heuristicWeight, trafficWeight, blockedNodes, nodeByIdRef]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStep(0);
    setResult(null);
    setVehiclePosition(0);
    setIsVehicleAnimating(false);
    setMultiResults([]);
    setComparisonResults([]);
    setShowStats(false);
    if (hasFittedPathRef?.current !== undefined) {
      hasFittedPathRef.current = false;
    }

    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    if (vehicleAnimationRef?.current) {
      window.cancelAnimationFrame(vehicleAnimationRef.current);
      vehicleAnimationRef.current = null;
    }

    if (vehicleMarkerRef?.current) {
      vehicleMarkerRef.current.remove();
      vehicleMarkerRef.current = null;
    }

    if (vehicleTrailRef?.current) {
      vehicleTrailRef.current.remove();
      vehicleTrailRef.current = null;
    }
    
    // Reset graph node states
    if (graph && Array.isArray(graph)) {
      graph.forEach(node => {
        node.visited = false;
        node.visitedForward = false;
        node.visitedBackward = false;
        node.parent = null;
        node.g = Infinity;
        node.f = Infinity;
        node.h = 0;
      });
    }
    
    // Clear map visuals
    if (markersRef?.current) {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    }
    if (polylinesRef?.current) {
      polylinesRef.current.forEach(polyline => polyline.remove());
      polylinesRef.current = [];
    }
    
    console.log("Application reset");
  }, [
    graph, markersRef, polylinesRef, setIsVehicleAnimating, setVehiclePosition,
    vehicleAnimationRef, vehicleMarkerRef, vehicleTrailRef, hasFittedPathRef
  ]);

  return {
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
  };
};
