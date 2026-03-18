import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, TrendingUp, Clock, Car, Settings, Navigation, Activity } from 'lucide-react';
import L from 'leaflet';

import osmData from './graph.json';

// Haversine distance calculator
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dlng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dlng/2) * Math.sin(dlng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Priority Queue
class PriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(val, priority) {
    this.values.push({ val, priority });
    this.sort();
  }

  dequeue() {
    return this.values.shift();
  }

  sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }

  isEmpty() {
    return this.values.length === 0;
  }
}

// Graph Node
class Node {
  constructor(id, lat, lng) {
    this.id = id;
    this.lat = lat;
    this.lng = lng;
    this.neighbors = [];
    this.g = Infinity;
    this.h = 0;
    this.f = Infinity;
    this.parent = null;
    this.visited = false;
    this.blocked = false;
  }
}

// Load OSM data into graph structure
const loadOSMGraph = (data) => {
  if (!data || !Array.isArray(data)) {
    console.error('OSM data is missing or invalid');
    return [];
  }

  const nodeMap = {};
  const nodes = [];

  data.forEach((item) => {
    const node = new Node(item.id, item.lat, item.lng);
    nodeMap[item.id] = node;
    nodes.push(node);
  });

  data.forEach((item) => {
    const node = nodeMap[item.id];
    if (!node || !item.neighbors) return;

    item.neighbors.forEach((neighbor) => {
      const neighborNode = nodeMap[neighbor.id];
      if (!neighborNode) return;

      const weight = haversine(node.lat, node.lng, neighborNode.lat, neighborNode.lng);
      node.neighbors.push({ node: neighborNode, weight });
    });
  });

  return nodes;
};

const MAX_BACKGROUND_NODES = 4000;

const sampleNodesForRendering = (nodes, limit = MAX_BACKGROUND_NODES) => {
  if (!Array.isArray(nodes) || nodes.length <= limit) {
    return nodes;
  }

  const stride = Math.ceil(nodes.length / limit);
  return nodes.filter((_, index) => index % stride === 0);
};

const calculatePathDistance = (path, nodeByIdMap) => {
  if (!Array.isArray(path) || path.length < 2) {
    return 0;
  }

  let distance = 0;
  for (let i = 1; i < path.length; i += 1) {
    const prev = nodeByIdMap.get(path[i - 1]);
    const curr = nodeByIdMap.get(path[i]);
    if (!prev || !curr) continue;
    distance += haversine(prev.lat, prev.lng, curr.lat, curr.lng);
  }

  return distance;
};

const interpolateLatLng = (start, end, t) => {
  return [
    start[0] + ((end[0] - start[0]) * t),
    start[1] + ((end[1] - start[1]) * t)
  ];
};

const calculateBearing = (fromLat, fromLng, toLat, toLng) => {
  const fromLatRad = (fromLat * Math.PI) / 180;
  const toLatRad = (toLat * Math.PI) / 180;
  const deltaLngRad = ((toLng - fromLng) * Math.PI) / 180;

  const y = Math.sin(deltaLngRad) * Math.cos(toLatRad);
  const x =
    (Math.cos(fromLatRad) * Math.sin(toLatRad)) -
    (Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(deltaLngRad));

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

const shortestAngleDelta = (from, to) => {
  return ((to - from + 540) % 360) - 180;
};

const lerpAngle = (from, to, t) => {
  return (from + (shortestAngleDelta(from, to) * t) + 360) % 360;
};

const CAR_HEADING_OFFSET_DEG = -90;

const findNearestNode = (lat, lng, graph) => {
  if (!graph || graph.length === 0) {
    return null;
  }

  let closestNode = graph[0];
  let minDist = haversine(lat, lng, closestNode.lat, closestNode.lng);

  for (const node of graph) {
    if (!node || node.lat === undefined || node.lng === undefined) continue;
    const dist = haversine(lat, lng, node.lat, node.lng);
    if (dist < minDist) {
      minDist = dist;
      closestNode = node;
    }
  }

  return closestNode;
};

const aStarAlgorithm = (graph, startLat, startLng, endLat, endLng, heuristicWeight = 1, trafficWeight = 1, blockedNodes = []) => {
  if (!graph || graph.length === 0) {
    return { path: [], explored: [], steps: [] };
  }

  const startNode = findNearestNode(startLat, startLng, graph);
  const endNode = findNearestNode(endLat, endLng, graph);
  if (!startNode || !endNode) {
    return { path: [], explored: [], steps: [] };
  }

  const openSet = new PriorityQueue();
  const explored = [];
  const steps = [];
  const blockedSet = new Set(blockedNodes);

  graph.forEach((node) => {
    node.g = Infinity;
    node.f = Infinity;
    node.parent = null;
    node.visited = false;
  });

  startNode.g = 0;
  startNode.h = haversine(startNode.lat, startNode.lng, endNode.lat, endNode.lng) * heuristicWeight;
  startNode.f = startNode.g + startNode.h;
  openSet.enqueue(startNode, startNode.f);

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue().val;
    if (current.visited || blockedSet.has(current.id)) continue;

    current.visited = true;
    explored.push(current.id);
    steps.push(current.id);

    if (current.id === endNode.id) break;

    current.neighbors.forEach(({ node: neighbor, weight }) => {
      if (neighbor.visited || blockedSet.has(neighbor.id)) return;

      const tentativeG = current.g + (weight * trafficWeight);
      if (tentativeG < neighbor.g) {
        neighbor.parent = current;
        neighbor.g = tentativeG;
        neighbor.h = haversine(neighbor.lat, neighbor.lng, endNode.lat, endNode.lng) * heuristicWeight;
        neighbor.f = neighbor.g + neighbor.h;
        openSet.enqueue(neighbor, neighbor.f);
      }
    });
  }

  const path = [];
  let current = endNode;
  while (current) {
    path.unshift(current.id);
    current = current.parent;
  }

  if (path.length === 1 && path[0] !== startNode.id) {
    return { path: [], explored, steps };
  }

  return { path, explored, steps };
};

const dijkstraAlgorithm = (graph, startLat, startLng, endLat, endLng, trafficWeight = 1, blockedNodes = []) => {
  if (!graph || graph.length === 0) {
    return { path: [], explored: [], steps: [] };
  }

  const startNode = findNearestNode(startLat, startLng, graph);
  const endNode = findNearestNode(endLat, endLng, graph);
  if (!startNode || !endNode) {
    return { path: [], explored: [], steps: [] };
  }

  const pq = new PriorityQueue();
  const explored = [];
  const steps = [];
  const blockedSet = new Set(blockedNodes);

  graph.forEach((node) => {
    node.g = Infinity;
    node.parent = null;
    node.visited = false;
  });

  startNode.g = 0;
  pq.enqueue(startNode, 0);

  while (!pq.isEmpty()) {
    const current = pq.dequeue().val;
    if (current.visited || blockedSet.has(current.id)) continue;

    current.visited = true;
    explored.push(current.id);
    steps.push(current.id);

    if (current.id === endNode.id) break;

    current.neighbors.forEach(({ node: neighbor, weight }) => {
      if (neighbor.visited || blockedSet.has(neighbor.id)) return;

      const tentativeG = current.g + (weight * trafficWeight);
      if (tentativeG < neighbor.g) {
        neighbor.parent = current;
        neighbor.g = tentativeG;
        pq.enqueue(neighbor, neighbor.g);
      }
    });
  }

  const path = [];
  let current = endNode;
  while (current) {
    path.unshift(current.id);
    current = current.parent;
  }

  if (path.length === 1 && path[0] !== startNode.id) {
    return { path: [], explored, steps };
  }

  return { path, explored, steps };
};

const bidirectionalDijkstra = (graph, startLat, startLng, endLat, endLng, trafficWeight = 1, blockedNodes = []) => {
  if (!graph || graph.length === 0) {
    return { path: [], explored: [], steps: [] };
  }

  const startNode = findNearestNode(startLat, startLng, graph);
  const endNode = findNearestNode(endLat, endLng, graph);

  if (!startNode || !endNode) {
    return { path: [], explored: [], steps: [] };
  }

  const forwardPQ = new PriorityQueue();
  const backwardPQ = new PriorityQueue();

  const forwardDist = {};
  const backwardDist = {};
  const forwardParent = {};
  const backwardParent = {};
  const explored = [];
  const steps = [];
  const exploredSet = new Set();
  const blockedSet = new Set(blockedNodes);

  graph.forEach((node) => {
    forwardDist[node.id] = Infinity;
    backwardDist[node.id] = Infinity;
    node.visitedForward = false;
    node.visitedBackward = false;
  });

  forwardDist[startNode.id] = 0;
  backwardDist[endNode.id] = 0;
  forwardPQ.enqueue(startNode, 0);
  backwardPQ.enqueue(endNode, 0);

  let meetingNode = null;
  let minDist = Infinity;

  while (!forwardPQ.isEmpty() && !backwardPQ.isEmpty()) {
    if (!forwardPQ.isEmpty()) {
      const current = forwardPQ.dequeue().val;

      if (!current.visitedForward && !blockedSet.has(current.id)) {
        current.visitedForward = true;

        if (!exploredSet.has(current.id)) {
          exploredSet.add(current.id);
          explored.push(current.id);
          steps.push(current.id);
        }

        if (backwardDist[current.id] !== Infinity) {
          const totalDist = forwardDist[current.id] + backwardDist[current.id];
          if (totalDist < minDist) {
            minDist = totalDist;
            meetingNode = current;
          }
        }

        current.neighbors.forEach(({ node: neighbor, weight }) => {
          if (blockedSet.has(neighbor.id) || neighbor.visitedForward) return;

          const newDist = forwardDist[current.id] + (weight * trafficWeight);
          if (newDist < forwardDist[neighbor.id]) {
            forwardDist[neighbor.id] = newDist;
            forwardParent[neighbor.id] = current.id;
            forwardPQ.enqueue(neighbor, newDist);
          }
        });
      }
    }

    if (!backwardPQ.isEmpty()) {
      const current = backwardPQ.dequeue().val;
      
      if (!current.visitedBackward && !blockedSet.has(current.id)) {
        current.visitedBackward = true;
        
        if (!exploredSet.has(current.id)) {
          exploredSet.add(current.id);
          explored.push(current.id);
          steps.push(current.id);
        }

        // Check if this node has been visited by forward search
        if (forwardDist[current.id] !== Infinity) {
          const totalDist = forwardDist[current.id] + backwardDist[current.id];
          if (totalDist < minDist) {
            minDist = totalDist;
            meetingNode = current;
          }
        }

        current.neighbors.forEach(({ node: neighbor, weight }) => {
          if (blockedSet.has(neighbor.id) || neighbor.visitedBackward) return;
          
          const newDist = backwardDist[current.id] + (weight * trafficWeight);
          if (newDist < backwardDist[neighbor.id]) {
            backwardDist[neighbor.id] = newDist;
            backwardParent[neighbor.id] = current.id;
            backwardPQ.enqueue(neighbor, newDist);
          }
        });
      }
    }

    if (meetingNode !== null && minDist < Infinity) break;
  }

  // Reconstruct path
  const path = [];
  if (meetingNode !== null) {
    // Forward path
    let curr = meetingNode.id;
    const forwardPath = [];
    while (curr !== undefined) {
      forwardPath.unshift(curr);
      curr = forwardParent[curr];
    }

    // Backward path (excluding meeting node to avoid duplication)
    curr = backwardParent[meetingNode.id];
    const backwardPath = [];
    while (curr !== undefined && curr !== endNode.id) {
      backwardPath.push(curr);
      curr = backwardParent[curr];
    }
    if (endNode.id !== meetingNode.id) {
      backwardPath.push(endNode.id);
    }

    path.push(...forwardPath, ...backwardPath);
  }

  return { path, explored, steps };
};

// BFS Algorithm - FIXED VERSION
const bfsAlgorithm = (graph, startLat, startLng, endLat, endLng, blockedNodes = []) => {
  if (!graph || graph.length === 0) {
    return { path: [], explored: [], steps: [] };
  }

  const startNode = findNearestNode(startLat, startLng, graph);
  const endNode = findNearestNode(endLat, endLng, graph);

  if (!startNode || !endNode) {
    return { path: [], explored: [], steps: [] };
  }

  const queue = [startNode];
  const explored = [];
  const steps = [];
  const blockedSet = new Set(blockedNodes);

  // Reset graph state
  graph.forEach(node => {
    node.visited = false;
    node.parent = null;
  });

  startNode.visited = true;

  while (queue.length > 0) {
    const current = queue.shift();

    if (blockedSet.has(current.id)) continue;

    explored.push(current.id);
    steps.push(current.id);

    if (current.id === endNode.id) break;

    current.neighbors.forEach(({ node: neighbor }) => {
      if (!neighbor.visited && !blockedSet.has(neighbor.id)) {
        neighbor.visited = true;
        neighbor.parent = current;
        queue.push(neighbor);
      }
    });
  }

  // Reconstruct path
  const path = [];
  let current = endNode;
  while (current) {
    path.unshift(current.id);
    current = current.parent;
  }

  // If no path found, return empty
  if (path.length === 1 && path[0] !== startNode.id) {
    return { path: [], explored, steps };
  }

  return { path, explored, steps };
};

// Greedy Best-First Search - FIXED VERSION
const greedyBFS = (graph, startLat, startLng, endLat, endLng, blockedNodes = []) => {
  if (!graph || graph.length === 0) {
    return { path: [], explored: [], steps: [] };
  }

  const startNode = findNearestNode(startLat, startLng, graph);
  const endNode = findNearestNode(endLat, endLng, graph);

  if (!startNode || !endNode) {
    return { path: [], explored: [], steps: [] };
  }

  const openSet = new PriorityQueue();
  const explored = [];
  const steps = [];
  const blockedSet = new Set(blockedNodes);

  // Reset graph state
  graph.forEach(node => {
    node.visited = false;
    node.parent = null;
    node.h = 0;
  });

  startNode.h = haversine(startNode.lat, startNode.lng, endNode.lat, endNode.lng);
  openSet.enqueue(startNode, startNode.h);

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue().val;

    if (current.visited || blockedSet.has(current.id)) continue;
    
    current.visited = true;
    explored.push(current.id);
    steps.push(current.id);

    if (current.id === endNode.id) break;

    current.neighbors.forEach(({ node: neighbor }) => {
      if (!neighbor.visited && !blockedSet.has(neighbor.id)) {
        neighbor.parent = current;
        neighbor.h = haversine(neighbor.lat, neighbor.lng, endNode.lat, endNode.lng);
        openSet.enqueue(neighbor, neighbor.h);
      }
    });
  }

  // Reconstruct path
  const path = [];
  let current = endNode;
  while (current) {
    path.unshift(current.id);
    current = current.parent;
  }

  // If no path found, return empty
  if (path.length === 1 && path[0] !== startNode.id) {
    return { path: [], explored, steps };
  }

  return { path, explored, steps };
};

// DFS Algorithm - FIXED VERSION
const dfsAlgorithm = (graph, startLat, startLng, endLat, endLng, blockedNodes = []) => {
  if (!graph || graph.length === 0) {
    return { path: [], explored: [], steps: [] };
  }

  const startNode = findNearestNode(startLat, startLng, graph);
  const endNode = findNearestNode(endLat, endLng, graph);

  if (!startNode || !endNode) {
    return { path: [], explored: [], steps: [] };
  }

  const stack = [startNode];
  const explored = [];
  const steps = [];
  const blockedSet = new Set(blockedNodes);

  // Reset graph state
  graph.forEach(node => {
    node.visited = false;
    node.parent = null;
  });

  startNode.visited = true;

  while (stack.length > 0) {
    const current = stack.pop();

    if (blockedSet.has(current.id)) continue;

    explored.push(current.id);
    steps.push(current.id);

    if (current.id === endNode.id) break;

    // Process neighbors in reverse order for more natural DFS behavior
    for (let i = current.neighbors.length - 1; i >= 0; i--) {
      const { node: neighbor } = current.neighbors[i];
      if (!neighbor.visited && !blockedSet.has(neighbor.id)) {
        neighbor.visited = true;
        neighbor.parent = current;
        stack.push(neighbor);
      }
    }
  }

  // Reconstruct path
  const path = [];
  let current = endNode;
  while (current) {
    path.unshift(current.id);
    current = current.parent;
  }

  // If no path found, return empty
  if (path.length === 1 && path[0] !== startNode.id) {
    return { path: [], explored, steps };
  }

  return { path, explored, steps };
};



const SmartRoute360 = () => {
  const [graph, setGraph] = useState([]);
  const [startNode, setStartNode] = useState({ lat: 23.0225, lng: 72.5714 });
  const [endNode, setEndNode] = useState({ lat: 23.05, lng: 72.60 });
  const [algorithm, setAlgorithm] = useState('astar');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [mapStyle, _setMapStyle] = useState('streets');
  const [heuristicWeight, setHeuristicWeight] = useState(1);
  const [trafficWeight, setTrafficWeight] = useState(1);
  const [speed, setSpeed] = useState(50);
  const [vehiclePosition, setVehiclePosition] = useState(0);
  const [isVehicleAnimating, setIsVehicleAnimating] = useState(false);
  const [_comparisonResults, setComparisonResults] = useState([]);
  const [_showStats, setShowStats] = useState(false);
  const [blockedNodes, setBlockedNodes] = useState([]);
  const [multiAlgorithms, _setMultiAlgorithms] = useState([]);
  const [multiResults, setMultiResults] = useState([]);
  const [graphEdgeCount, setGraphEdgeCount] = useState(0);
  const [renderedBackgroundNodeCount, setRenderedBackgroundNodeCount] = useState(0);
 
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const animationRef = useRef(null);
  const vehicleAnimationRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const vehicleTrailRef = useRef(null);
  const graphRef = useRef([]);
  const nodeByIdRef = useRef(new Map());
  const hasFittedPathRef = useRef(false);
  const backgroundMarkersRef = useRef([]);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);

  // Load graph data - FIXED VERSION
  useEffect(() => {
    console.log("Loading graph data...");
    
    // Use imported osmData directly
    if (osmData && Array.isArray(osmData)) {
      const graphNodes = loadOSMGraph(osmData);
      const edges = graphNodes.reduce((acc, node) => acc + node.neighbors.length, 0);
      console.log(`Loaded ${graphNodes.length} nodes from OSM data`);
      graphRef.current = graphNodes;
      nodeByIdRef.current = new Map(graphNodes.map((node) => [node.id, node]));
      setGraph(graphNodes);
      setGraphEdgeCount(edges);
    } else {
      console.error("Failed to load OSM data");
    }
  }, []);

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);
  
  // Initialize Leaflet map - ENHANCED VERSION
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    const map = L.map(mapContainerRef.current, {
      center: [23.0225, 72.5714],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true
    });
    
    const tileUrls = {
      streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
    };
    
    const tileLayer = L.tileLayer(tileUrls.streets, {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    });
    
    tileLayer.addTo(map);
    mapRef.current = map;
    
    // Enhanced click handler with node display
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      
      if (e.originalEvent.ctrlKey) {
        // Ctrl+Click to block/unblock nodes
        const nearestNode = findNearestNode(lat, lng, graphRef.current);
        if (nearestNode) {
          setBlockedNodes(prev => {
            if (prev.includes(nearestNode.id)) {
              return prev.filter(id => id !== nearestNode.id);
            } else {
              return [...prev, nearestNode.id];
            }
          });
        }
      } else if (e.originalEvent.shiftKey) {
        setEndNode({ lat, lng });
      } else {
        setStartNode({ lat, lng });
      }
    });
    
    return () => {
      backgroundMarkersRef.current.forEach((marker) => marker.remove());
      backgroundMarkersRef.current = [];
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      polylinesRef.current.forEach((polyline) => polyline.remove());
      polylinesRef.current = [];
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.remove();
        vehicleMarkerRef.current = null;
      }
      if (vehicleTrailRef.current) {
        vehicleTrailRef.current.remove();
        vehicleTrailRef.current = null;
      }

      if (vehicleAnimationRef.current) {
        window.cancelAnimationFrame(vehicleAnimationRef.current);
        vehicleAnimationRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);
  
  // Update map style
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });
    
    const tileUrls = {
      streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
    };
    
    L.tileLayer(tileUrls[mapStyle], {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
  }, [mapStyle]);

  // Draw a sampled subset of nodes once to avoid freezing the map.
  useEffect(() => {
    if (!mapRef.current || !graph || graph.length === 0) return;

    const map = mapRef.current;

    backgroundMarkersRef.current.forEach((marker) => marker.remove());
    backgroundMarkersRef.current = [];

    const sampledNodes = sampleNodesForRendering(graph);
    sampledNodes.forEach((node) => {
      if (node && node.lat !== undefined && node.lng !== undefined) {
        const marker = L.circleMarker([node.lat, node.lng], {
          radius: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          color: '#1e40af',
          weight: 1,
          opacity: 0.35
        }).addTo(map);
        backgroundMarkersRef.current.push(marker);
      }
    });

    setRenderedBackgroundNodeCount(sampledNodes.length);
  }, [graph]);

  // Draw dynamic overlays (exploration, path, blocked nodes, markers).
  useEffect(() => {
    if (!mapRef.current || !graph || graph.length === 0) return;

    const map = mapRef.current;
    const nodeById = nodeByIdRef.current;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    polylinesRef.current.forEach((polyline) => polyline.remove());
    polylinesRef.current = [];

    if (isRunning && result?.steps && currentStep > 0 && currentStep <= result.steps.length) {
      for (let i = 0; i < currentStep; i += 1) {
        const nodeId = result.steps[i];
        const node = nodeById.get(nodeId);
        if (!node) continue;

        const marker = L.circleMarker([node.lat, node.lng], {
          radius: 3,
          fillColor: '#60a5fa',
          fillOpacity: 0.7,
          color: '#1d4ed8',
          weight: 1
        }).addTo(map);
        markersRef.current.push(marker);
      }
    }

    if (result?.path && result.path.length > 0 && currentStep >= (result.steps?.length || 0)) {
      const pathCoords = result.path
        .map((id) => {
          const node = nodeById.get(id);
          return node ? [node.lat, node.lng] : null;
        })
        .filter((coord) => coord !== null);

      if (pathCoords.length > 0) {
        const polyline = L.polyline(pathCoords, {
          color: '#10b981',
          weight: 6,
          opacity: 0.9,
          lineCap: 'round'
        }).addTo(map);
        polylinesRef.current.push(polyline);

        if (!hasFittedPathRef.current) {
          map.fitBounds(polyline.getBounds());
          hasFittedPathRef.current = true;
        }
      }
    }

    if (multiResults.length > 0) {
      const colors = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
      multiResults.forEach((res, idx) => {
        if (!res.path || res.path.length === 0) return;

        const pathCoords = res.path
          .map((id) => {
            const node = nodeById.get(id);
            return node ? [node.lat, node.lng] : null;
          })
          .filter((coord) => coord !== null);

        if (pathCoords.length > 0) {
          const polyline = L.polyline(pathCoords, {
            color: colors[idx % colors.length],
            weight: 4,
            opacity: 0.8,
            dashArray: '5, 5'
          }).addTo(map);
          polylinesRef.current.push(polyline);
        }
      });
    }

    blockedNodes.forEach((nodeId) => {
      const node = nodeById.get(nodeId);
      if (!node) return;

      const marker = L.circleMarker([node.lat, node.lng], {
        radius: 8,
        fillColor: '#ef4444',
        fillOpacity: 0.9,
        color: '#fff',
        weight: 2
      }).addTo(map);
      markersRef.current.push(marker);
    });

    if (startNode) {
      const startIcon = L.divIcon({
        html: `<div style="background: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: bold;">S</div>`,
        className: '',
        iconSize: [24, 24]
      });
      const startMarker = L.marker([startNode.lat, startNode.lng], { icon: startIcon }).addTo(map);
      markersRef.current.push(startMarker);
    }

    if (endNode) {
      const endIcon = L.divIcon({
        html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: bold;">E</div>`,
        className: '',
        iconSize: [24, 24]
      });
      const endMarker = L.marker([endNode.lat, endNode.lng], { icon: endIcon }).addTo(map);
      markersRef.current.push(endMarker);
    }
  }, [graph, startNode, endNode, result, currentStep, blockedNodes, multiResults, isRunning]);

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
  
  // Vehicle animation
  useEffect(() => {
    if (!isVehicleAnimating || !result?.path || !mapRef.current) {
      return () => {};
    }

    const nodeById = nodeByIdRef.current;
    const map = mapRef.current;

    const pathCoords = result.path
      .map((id) => {
        const node = nodeById.get(id);
        return node ? [node.lat, node.lng] : null;
      })
      .filter((coord) => coord !== null);

    if (pathCoords.length < 2) {
      setIsVehicleAnimating(false);
      return () => {};
    }

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.remove();
    }
    if (vehicleTrailRef.current) {
      vehicleTrailRef.current.remove();
    }

    const vehicleIcon = L.divIcon({
      html: `<div class="vehicle-shell" style="width: 42px; height: 24px; display: flex; align-items: center; justify-content: center; transform: rotate(0deg); transform-origin: center center; will-change: transform;"><svg width="42" height="24" viewBox="0 0 42 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="carPaint" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fb923c"/><stop offset="55%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><rect x="6" y="5" width="28" height="14" rx="5" fill="url(#carPaint)" stroke="#ffffff" stroke-width="1.8"/><rect x="14" y="7" width="10" height="4" rx="2" fill="rgba(255,255,255,0.6)"/><rect x="34" y="10" width="3" height="4" rx="1.5" fill="#fde68a"/><rect x="8" y="3" width="7" height="3" rx="1.5" fill="#0f172a"/><rect class="vehicle-wheel-front" x="26.5" y="3" width="7" height="3" rx="1.5" fill="#0f172a" style="transform-origin: 30px 4.5px; transition: transform 90ms linear;"/><rect x="8" y="18" width="7" height="3" rx="1.5" fill="#0f172a"/><rect class="vehicle-wheel-front" x="26.5" y="18" width="7" height="3" rx="1.5" fill="#0f172a" style="transform-origin: 30px 19.5px; transition: transform 90ms linear;"/></svg></div>`,
      className: '',
      iconSize: [42, 24],
      iconAnchor: [21, 12]
    });

    const marker = L.marker(pathCoords[0], {
      icon: vehicleIcon,
      zIndexOffset: 1000
    }).addTo(map);

    const trail = L.polyline([pathCoords[0]], {
      color: '#f59e0b',
      weight: 7,
      opacity: 0.95,
      lineCap: 'round'
    }).addTo(map);

    vehicleMarkerRef.current = marker;
    vehicleTrailRef.current = trail;

    const segmentLengths = [];
    const cumulativeDistances = [0];

    for (let i = 0; i < pathCoords.length - 1; i += 1) {
      const start = pathCoords[i];
      const end = pathCoords[i + 1];
      const segmentLengthMeters = Math.max(0.1, haversine(start[0], start[1], end[0], end[1]) * 1000);

      segmentLengths.push(segmentLengthMeters);
      cumulativeDistances.push(cumulativeDistances[i] + segmentLengthMeters);
    }

    const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];
    const getTurnSeverity = (index) => {
      if (index >= pathCoords.length - 2) {
        return 0;
      }

      const a = pathCoords[index];
      const b = pathCoords[index + 1];
      const c = pathCoords[index + 2];
      const bearingAB = calculateBearing(a[0], a[1], b[0], b[1]);
      const bearingBC = calculateBearing(b[0], b[1], c[0], c[1]);
      const turnAngle = Math.abs(shortestAngleDelta(bearingAB, bearingBC));

      return Math.min(1, turnAngle / 95);
    };

    let lastTimestamp = null;
    let segmentIndex = 0;
    let distanceTraveled = 0;
    let speedMps = 0;
    let smoothedBearing = calculateBearing(
      pathCoords[0][0],
      pathCoords[0][1],
      pathCoords[1][0],
      pathCoords[1][1]
    );

    const baseCruiseSpeed = 12 + (speed * 0.5);
    const accelerationMps2 = 6 + (speed * 0.06);
    const brakingMps2 = 8 + (speed * 0.08);

    const animateVehicle = (timestamp) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const deltaMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      const dtSec = Math.min(0.05, deltaMs / 1000);

      while (segmentIndex < segmentLengths.length - 1 && distanceTraveled >= cumulativeDistances[segmentIndex + 1]) {
        segmentIndex += 1;
      }

      const distanceToEnd = totalDistance - distanceTraveled;
      const distanceToSegmentEnd = cumulativeDistances[segmentIndex + 1] - distanceTraveled;
      const turnSeverity = getTurnSeverity(segmentIndex);
      const brakingWindow = 12 + (baseCruiseSpeed * 1.25);

      let speedFactor = 1;
      if (turnSeverity > 0 && distanceToSegmentEnd < brakingWindow) {
        const turnApproach = 1 - (distanceToSegmentEnd / brakingWindow);
        speedFactor -= 0.55 * turnSeverity * turnApproach;
      }

      if (distanceToEnd < brakingWindow) {
        const stopFactor = Math.max(0.18, distanceToEnd / brakingWindow);
        speedFactor = Math.min(speedFactor, stopFactor);
      }

      const targetSpeedMps = Math.max(6, baseCruiseSpeed * speedFactor);

      if (speedMps < targetSpeedMps) {
        speedMps = Math.min(targetSpeedMps, speedMps + (accelerationMps2 * dtSec));
      } else {
        speedMps = Math.max(targetSpeedMps, speedMps - (brakingMps2 * dtSec));
      }

      distanceTraveled = Math.min(totalDistance, distanceTraveled + (speedMps * dtSec * 1.65));

      while (segmentIndex < segmentLengths.length - 1 && distanceTraveled >= cumulativeDistances[segmentIndex + 1]) {
        segmentIndex += 1;
      }

      const segmentStartDistance = cumulativeDistances[segmentIndex];
      const segmentLength = segmentLengths[segmentIndex] || 0.1;
      const segmentProgress = Math.min(
        Math.max((distanceTraveled - segmentStartDistance) / segmentLength, 0),
        1
      );

      const start = pathCoords[segmentIndex];
      const end = pathCoords[segmentIndex + 1];
      const currentPosition = interpolateLatLng(start, end, segmentProgress);
      const rawBearing = calculateBearing(start[0], start[1], end[0], end[1]);
      smoothedBearing = lerpAngle(smoothedBearing, rawBearing, Math.min(1, dtSec * 7));

      const steeringAngle = Math.max(
        -22,
        Math.min(22, shortestAngleDelta(smoothedBearing, rawBearing) * 1.35)
      );

      marker.setLatLng(currentPosition);

      const markerElement = marker.getElement();
      if (markerElement) {
        const shell = markerElement.querySelector('.vehicle-shell');
        if (shell) {
          shell.style.transform = `rotate(${smoothedBearing + CAR_HEADING_OFFSET_DEG}deg)`;
        }

        const frontWheels = markerElement.querySelectorAll('.vehicle-wheel-front');
        frontWheels.forEach((wheel) => {
          wheel.style.transform = `rotate(${steeringAngle}deg)`;
        });
      }

      if (segmentIndex >= pathCoords.length - 1) {
        trail.setLatLngs(pathCoords);
        setVehiclePosition(pathCoords.length - 1);
        setIsVehicleAnimating(false);
        return;
      }

      const traveledCoords = pathCoords.slice(0, segmentIndex + 1);
      traveledCoords.push(currentPosition);
      trail.setLatLngs(traveledCoords);

      setVehiclePosition(segmentIndex + segmentProgress);

      if (distanceTraveled >= totalDistance) {
        trail.setLatLngs(pathCoords);
        setVehiclePosition(pathCoords.length - 1);
        setIsVehicleAnimating(false);
        return;
      }

      vehicleAnimationRef.current = window.requestAnimationFrame(animateVehicle);
    };

    if (totalDistance <= 0.1) {
      setVehiclePosition(pathCoords.length - 1);
      setIsVehicleAnimating(false);
      return () => {
        if (vehicleAnimationRef.current) {
          window.cancelAnimationFrame(vehicleAnimationRef.current);
          vehicleAnimationRef.current = null;
        }
      };
    };

    setVehiclePosition(0);
    vehicleAnimationRef.current = window.requestAnimationFrame(animateVehicle);
    
    return () => {
      if (vehicleAnimationRef.current) {
        window.cancelAnimationFrame(vehicleAnimationRef.current);
        vehicleAnimationRef.current = null;
      }
    };
  }, [isVehicleAnimating, result, speed]);

  // Enhanced runAlgorithm function
  const runAlgorithm = () => {
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

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.remove();
      vehicleMarkerRef.current = null;
    }

    if (vehicleTrailRef.current) {
      vehicleTrailRef.current.remove();
      vehicleTrailRef.current = null;
    }
    
    console.log(`Algorithm completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`Path found: ${res.path.length} nodes, Distance: ${distance.toFixed(3)}km`);
  };

  // [Keep other functions like runMultipleAlgorithms, compareAlgorithms, reset, startVehicle, clearBlockedNodes the same]
   const reset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStep(0);
    setResult(null);
    setVehiclePosition(0);
    setIsVehicleAnimating(false);
    setMultiResults([]);
    setComparisonResults([]);
    setShowStats(false);
    hasFittedPathRef.current = false;

    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    if (vehicleAnimationRef.current) {
      window.cancelAnimationFrame(vehicleAnimationRef.current);
      vehicleAnimationRef.current = null;
    }

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.remove();
      vehicleMarkerRef.current = null;
    }

    if (vehicleTrailRef.current) {
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
    if (mapRef.current) {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      polylinesRef.current.forEach(polyline => polyline.remove());
      polylinesRef.current = [];
    }
    
    console.log("Application reset");
  };

  const startVehicle = () => {
    if (result && result.path && result.path.length > 1) {
      setVehiclePosition(0);
      setIsVehicleAnimating(true);
      console.log("Vehicle animation started");
    } else {
      console.warn("No path available for vehicle animation");
    }
  };

  const _clearBlockedNodes = () => {
    setBlockedNodes([]);
    console.log("Blocked nodes cleared");
  };

  const _runMultipleAlgorithms = () => {
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
  };

  const _compareAlgorithms = () => {
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
                  <p className="mt-1 text-lg font-semibold text-cyan-300">{graph.length.toLocaleString()}</p>
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
                    disabled={isRunning || graph.length === 0}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Play className="h-4 w-4" />
                    {graph.length === 0 ? 'Loading Graph...' : 'Run Algorithm'}
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
                      onClick={_clearBlockedNodes}
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

              {result && (
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
              )}

              <div className="rounded-2xl border border-slate-700/70 bg-slate-800/55 p-4 text-xs text-slate-300">
                <p className="mb-2 font-semibold text-slate-100">Map Interaction</p>
                <div className="space-y-1">
                  <p>Click: set start point</p>
                  <p>Shift + Click: set destination</p>
                  <p>Ctrl + Click: block/unblock node</p>
                  <p>Scroll: zoom, Drag: pan</p>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex min-h-[63vh] flex-col overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/55 shadow-2xl backdrop-blur-md lg:min-h-[calc(100vh-3.75rem)]">
            <div className="border-b border-slate-700/60 bg-slate-900/70 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1 text-slate-200">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                    Start
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1 text-slate-200">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    End
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
                  {graph.length > 0 ? `${graph.length.toLocaleString()} nodes | ${renderedBackgroundNodeCount.toLocaleString()} rendered` : 'Loading graph...'}
                </div>
              </div>
            </div>

            <div className="relative flex-1 bg-[#122236]">
              <div
                ref={mapContainerRef}
                className="h-[63vh] w-full lg:h-full"
                style={{ background: '#122236' }}
              />

              {isRunning && (
                <div className="absolute left-4 top-4 rounded-2xl border border-blue-400/40 bg-slate-900/85 px-4 py-2 text-sm text-slate-200 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 animate-pulse text-blue-300" />
                    <span>Exploring: {currentStep}/{result?.steps?.length || 0}</span>
                  </div>
                </div>
              )}

              {isVehicleAnimating && (
                <div className="absolute left-4 top-20 rounded-2xl border border-emerald-400/40 bg-slate-900/85 px-4 py-2 text-sm text-slate-200 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-emerald-300" />
                    <span>Driving: {vehiclePosition.toFixed(1)} / {(result?.path.length - 1 || 0).toFixed(1)}</span>
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 right-4 rounded-2xl border border-slate-600/80 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-cyan-300" />
                  <span>{result ? `${result.time.toFixed(1)} ms` : 'Run algorithm to measure'}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SmartRoute360;