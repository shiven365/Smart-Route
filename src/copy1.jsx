import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Play, Pause, RotateCcw, Zap, TrendingUp, Clock, Route, Car, Settings, BarChart3, AlertTriangle, Navigation, Layers, Activity, Target, Trash2, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

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

// Load OSM data into graph structure - FIXED VERSION
const loadOSMGraph = (osmData) => {
  if (!osmData || !Array.isArray(osmData)) {
    console.error("OSM data is missing or not an array!");
    return [];
  }

  const nodeMap = {};
  const nodes = [];
  
  // First pass: Create all nodes
  osmData.forEach(item => {
    const node = new Node(item.id, item.lat, item.lng);
    nodeMap[item.id] = node;
    nodes.push(node);
  });
  
  // Second pass: Link neighbors with proper weight calculation
  osmData.forEach(item => {
    const node = nodeMap[item.id];
    if (node && item.neighbors) {
      item.neighbors.forEach(neighbor => {
        const neighborNode = nodeMap[neighbor.id];
        if (neighborNode) {
          // Calculate actual distance as weight
          const weight = haversine(node.lat, node.lng, neighborNode.lat, neighborNode.lng);
          node.neighbors.push({
            node: neighborNode,
            weight: weight
          });
        }
      });
    }
  });
  
  return nodes;
};

// Helper function to find nearest node - FIXED VERSION
const findNearestNode = (lat, lng, graph) => {
  if (!graph || graph.length === 0) {
    console.warn("Graph is empty or undefined");
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

// A* Algorithm - FIXED VERSION
const aStarAlgorithm = (graph, startLat, startLng, endLat, endLng, heuristicWeight = 1, trafficWeight = 1, blockedNodes = []) => {
  if (!graph || graph.length === 0) {
    console.error("Graph is empty in A* algorithm");
    return { path: [], explored: [], steps: [] };
  }

  const startNode = findNearestNode(startLat, startLng, graph);
  const endNode = findNearestNode(endLat, endLng, graph);

  if (!startNode || !endNode) {
    console.error("Start or end node not found");
    return { path: [], explored: [], steps: [] };
  }

  const openSet = new PriorityQueue();
  const explored = [];
  const steps = [];

  // Reset graph state
  graph.forEach(node => {
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

    if (current.visited || blockedNodes.includes(current.id)) continue;
    
    current.visited = true;
    explored.push(current.id);
    steps.push([...explored]);

    if (current.id === endNode.id) {
      console.log("Path found!");
      break;
    }

    current.neighbors.forEach(({ node: neighbor, weight }) => {
      if (neighbor.visited || blockedNodes.includes(neighbor.id)) return;

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

  console.log(`A* completed: Explored ${explored.length} nodes, Path length: ${path.length}`);
  return { path, explored, steps };
};

// [Keep all other algorithms the same but ensure they use the fixed findNearestNode approach]

// Dijkstra's Algorithm - FIXED VERSION
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

  graph.forEach(node => {
    node.g = Infinity;
    node.parent = null;
    node.visited = false;
  });

  startNode.g = 0;
  pq.enqueue(startNode, 0);

  while (!pq.isEmpty()) {
    const current = pq.dequeue().val;

    if (current.visited || blockedNodes.includes(current.id)) continue;
    current.visited = true;
    explored.push(current.id);
    steps.push([...explored]);

    if (current.id === endNode.id) break;

    current.neighbors.forEach(({ node: neighbor, weight }) => {
      if (neighbor.visited || blockedNodes.includes(neighbor.id)) return;

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

  return { path, explored, steps };
};

// [Keep bidirectionalDijkstra, bfsAlgorithm, greedyBFS, dfsAlgorithm the same but ensure they use the fixed approach]
// Bidirectional Dijkstra - FIXED VERSION
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

  // Initialize distances
  graph.forEach(node => {
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
    // Forward search
    if (!forwardPQ.isEmpty()) {
      const current = forwardPQ.dequeue().val;
      
      if (!current.visitedForward && !blockedNodes.includes(current.id)) {
        current.visitedForward = true;
        
        if (!explored.includes(current.id)) {
          explored.push(current.id);
          steps.push([...explored]);
        }

        // Check if this node has been visited by backward search
        if (backwardDist[current.id] !== Infinity) {
          const totalDist = forwardDist[current.id] + backwardDist[current.id];
          if (totalDist < minDist) {
            minDist = totalDist;
            meetingNode = current;
          }
        }

        current.neighbors.forEach(({ node: neighbor, weight }) => {
          if (blockedNodes.includes(neighbor.id) || neighbor.visitedForward) return;
          
          const newDist = forwardDist[current.id] + (weight * trafficWeight);
          if (newDist < forwardDist[neighbor.id]) {
            forwardDist[neighbor.id] = newDist;
            forwardParent[neighbor.id] = current.id;
            forwardPQ.enqueue(neighbor, newDist);
          }
        });
      }
    }

    // Backward search
    if (!backwardPQ.isEmpty()) {
      const current = backwardPQ.dequeue().val;
      
      if (!current.visitedBackward && !blockedNodes.includes(current.id)) {
        current.visitedBackward = true;
        
        if (!explored.includes(current.id)) {
          explored.push(current.id);
          steps.push([...explored]);
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
          if (blockedNodes.includes(neighbor.id) || neighbor.visitedBackward) return;
          
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

  // Reset graph state
  graph.forEach(node => {
    node.visited = false;
    node.parent = null;
  });

  startNode.visited = true;

  while (queue.length > 0) {
    const current = queue.shift();

    if (blockedNodes.includes(current.id)) continue;

    if (!explored.includes(current.id)) {
      explored.push(current.id);
      steps.push([...explored]);
    }

    if (current.id === endNode.id) break;

    current.neighbors.forEach(({ node: neighbor }) => {
      if (!neighbor.visited && !blockedNodes.includes(neighbor.id)) {
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

    if (current.visited || blockedNodes.includes(current.id)) continue;
    
    current.visited = true;
    explored.push(current.id);
    steps.push([...explored]);

    if (current.id === endNode.id) break;

    current.neighbors.forEach(({ node: neighbor }) => {
      if (!neighbor.visited && !blockedNodes.includes(neighbor.id)) {
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

  // Reset graph state
  graph.forEach(node => {
    node.visited = false;
    node.parent = null;
  });

  startNode.visited = true;

  while (stack.length > 0) {
    const current = stack.pop();

    if (blockedNodes.includes(current.id)) continue;

    if (!explored.includes(current.id)) {
      explored.push(current.id);
      steps.push([...explored]);
    }

    if (current.id === endNode.id) break;

    // Process neighbors in reverse order for more natural DFS behavior
    for (let i = current.neighbors.length - 1; i >= 0; i--) {
      const { node: neighbor } = current.neighbors[i];
      if (!neighbor.visited && !blockedNodes.includes(neighbor.id)) {
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
  const [visualMode, setVisualMode] = useState('exploration');
  const [mapStyle, setMapStyle] = useState('streets');
  const [heuristicWeight, setHeuristicWeight] = useState(1);
  const [trafficWeight, setTrafficWeight] = useState(1);
  const [speed, setSpeed] = useState(50);
  const [vehiclePosition, setVehiclePosition] = useState(0);
  const [isVehicleAnimating, setIsVehicleAnimating] = useState(false);
  const [comparisonResults, setComparisonResults] = useState([]);
  const [showStats, setShowStats] = useState(false);
  const [blockedNodes, setBlockedNodes] = useState([]);
  const [multiAlgorithms, setMultiAlgorithms] = useState([]);
  const [multiResults, setMultiResults] = useState([]);
  const [allNodes, setAllNodes] = useState([]);
 
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const animationRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);

  // Load graph data - FIXED VERSION
  useEffect(() => {
    console.log("Loading graph data...");
    
    // Use imported osmData directly
    if (osmData && Array.isArray(osmData)) {
      const graphNodes = loadOSMGraph(osmData);
      console.log(`Loaded ${graphNodes.length} nodes from OSM data`);
      setGraph(graphNodes);
      setAllNodes(graphNodes); // Store all nodes for display
    } else {
      console.error("Failed to load OSM data");
    }
  }, []);
  
  // Initialize Leaflet map - ENHANCED VERSION
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    const L = window.L;
    if (!L) {
      console.error("Leaflet not loaded");
      return;
    }
    
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
    
    const tileLayer = L.tileLayer(tileUrls[mapStyle], {
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
        const nearestNode = findNearestNode(lat, lng, graph);
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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);
  
  // Update map style
  useEffect(() => {
    if (!mapRef.current) return;
    
    const L = window.L;
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

  // Enhanced map rendering with all nodes and algorithm visualization
  useEffect(() => {
    if (!mapRef.current || !graph || graph.length === 0) return;
    
    const L = window.L;
    const map = mapRef.current;

    // Clear existing markers and polylines
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    polylinesRef.current.forEach(polyline => polyline.remove());
    polylinesRef.current = [];

    // Draw all graph nodes as small dots
    graph.forEach(node => {
      if (node && node.lat !== undefined && node.lng !== undefined) {
        const marker = L.circleMarker([node.lat, node.lng], {
          radius: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.3,
          color: '#1e40af',
          weight: 1,
          opacity: 0.5
        }).addTo(map);
        markersRef.current.push(marker);
      }
    });

    // Draw explored nodes during algorithm execution
    if (isRunning && result && result.steps && currentStep > 0 && currentStep <= result.steps.length) {
      const exploredNodes = result.steps[currentStep - 1];
      exploredNodes.forEach(nodeId => {
        const node = graph.find(n => n.id === nodeId);
        if (node) {
          const marker = L.circleMarker([node.lat, node.lng], {
            radius: 3,
            fillColor: '#60a5fa',
            fillOpacity: 0.7,
            color: '#1d4ed8',
            weight: 1
          }).addTo(map);
          markersRef.current.push(marker);
        }
      });
    }

    // Draw final path
    if (result?.path && result.path.length > 0 && currentStep >= (result.steps?.length || 0)) {
      const pathCoords = result.path.map(id => {
        const node = graph.find(n => n.id === id);
        return node ? [node.lat, node.lng] : null;
      }).filter(coord => coord !== null);

      if (pathCoords.length > 0) {
        const polyline = L.polyline(pathCoords, {
          color: '#10b981',
          weight: 6,
          opacity: 0.9,
          lineCap: 'round'
        }).addTo(map);
        polylinesRef.current.push(polyline);
        
        // Fit map to show the entire path
        map.fitBounds(polyline.getBounds());
      }
    }

    // Draw multi-algorithm results
    if (multiResults.length > 0) {
      const colors = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
      multiResults.forEach((res, idx) => {
        if (res.path && res.path.length > 0) {
          const pathCoords = res.path.map(id => {
            const node = graph.find(n => n.id === id);
            return node ? [node.lat, node.lng] : null;
          }).filter(coord => coord !== null);

          if (pathCoords.length > 0) {
            const polyline = L.polyline(pathCoords, {
              color: colors[idx % colors.length],
              weight: 4,
              opacity: 0.8,
              dashArray: '5, 5'
            }).addTo(map);
            polylinesRef.current.push(polyline);
          }
        }
      });
    }

    // Draw vehicle animation
    if (isVehicleAnimating && result?.path) {
      const pathIndex = Math.min(Math.floor(vehiclePosition), result.path.length - 1);
      const nodeId = result.path[pathIndex];
      const node = graph.find(n => n.id === nodeId);
      if (node) {
        const vehicleIcon = L.divIcon({
          html: `<div style="background: #f59e0b; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: bold;">🚗</div>`,
          className: '',
          iconSize: [20, 20]
        });
        const marker = L.marker([node.lat, node.lng], { icon: vehicleIcon }).addTo(map);
        markersRef.current.push(marker);
      }
    }

    // Draw blocked nodes
    blockedNodes.forEach(nodeId => {
      const node = graph.find(n => n.id === nodeId);
      if (node) {
        const marker = L.circleMarker([node.lat, node.lng], {
          radius: 8,
          fillColor: '#ef4444',
          fillOpacity: 0.9,
          color: '#fff',
          weight: 2
        }).addTo(map);
        markersRef.current.push(marker);
      }
    });

    // Draw start marker
    if (startNode) {
      const startIcon = L.divIcon({
        html: `<div style="background: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: bold;">S</div>`,
        className: '',
        iconSize: [24, 24]
      });
      const startMarker = L.marker([startNode.lat, startNode.lng], { icon: startIcon }).addTo(map);
      markersRef.current.push(startMarker);
    }

    // Draw end marker
    if (endNode) {
      const endIcon = L.divIcon({
        html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: bold;">E</div>`,
        className: '',
        iconSize: [24, 24]
      });
      const endMarker = L.marker([endNode.lat, endNode.lng], { icon: endIcon }).addTo(map);
      markersRef.current.push(endMarker);
    }

  }, [graph, startNode, endNode, result, currentStep, visualMode, vehiclePosition, isVehicleAnimating, blockedNodes, multiResults, mapStyle, isRunning]);

  // Animation loop
  useEffect(() => {
    if (isRunning && !isPaused && result && result.steps) {
      animationRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= result.steps.length) {
            setIsRunning(false);
            return prev;
          }
          return prev + 1;
        });
      }, 100 - speed);
    }
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isRunning, isPaused, result, speed]);
  
  // Vehicle animation
  useEffect(() => {
    if (isVehicleAnimating && result && result.path) {
      animationRef.current = setInterval(() => {
        setVehiclePosition(prev => {
          if (prev >= result.path.length - 1) {
            setIsVehicleAnimating(false);
            return prev;
          }
          return prev + 0.1;
        });
      }, 50);
    }
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isVehicleAnimating, result]);

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
    
    // Calculate path distance
    const distance = res.path.reduce((acc, nodeId, i) => {
      if (i === 0) return 0;
      const prev = graph.find(n => n.id === res.path[i-1]);
      const curr = graph.find(n => n.id === nodeId);
      if (!prev || !curr) return acc;
      return acc + haversine(prev.lat, prev.lng, curr.lat, curr.lng);
    }, 0);
    
    setResult({
      ...res,
      time: endTime - startTime,
      distance,
      algorithm
    });
    setCurrentStep(0);
    setIsRunning(true);
    setIsPaused(false);
    setVehiclePosition(0);
    setMultiResults([]);
    
    console.log(`Algorithm completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`Path found: ${res.path.length} nodes, Distance: ${distance.toFixed(3)}km`);
  };

  // [Keep other functions like runMultipleAlgorithms, compareAlgorithms, reset, startVehicle, clearBlockedNodes the same]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="flex h-screen">
        {/* Left Control Panel */}
        <div className="w-96 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Header with status */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Navigation className="w-8 h-8 text-blue-400" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  SmartRoute360
                </h1>
              </div>
              <p className="text-slate-400 text-sm">Real-World Pathfinding Intelligence</p>
              <div className="mt-2 text-xs text-slate-500">
                Nodes: {graph.length} | Edges: {graph.reduce((acc, node) => acc + node.neighbors.length, 0)}
              </div>
            </div>

            {/* Algorithm Selection */}
            <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-yellow-400" />
                <h3 className="font-semibold">Algorithm</h3>
              </div>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="astar">A* (Optimal)</option>
                <option value="dijkstra">Dijkstra's Algorithm</option>
                <option value="bidirectional">Bidirectional Dijkstra</option>
                <option value="bfs">Breadth-First Search</option>
                <option value="greedy">Greedy Best-First</option>
                <option value="dfs">Depth-First Search</option>
              </select>
            </div>

            {/* Enhanced Parameters Section */}
            <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold">Parameters</h3>
              </div>
              
              <div className="space-y-4">
                {(algorithm === 'astar' || algorithm === 'greedy') && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Heuristic Weight: {heuristicWeight.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={heuristicWeight}
                      onChange={(e) => setHeuristicWeight(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Traffic Weight: {trafficWeight.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={trafficWeight}
                    onChange={(e) => setTrafficWeight(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Animation Speed: {speed}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={speed}
                    onChange={(e) => setSpeed(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Enhanced Controls with Status */}
            <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
              <h3 className="font-semibold mb-3">Controls</h3>
              <div className="space-y-2">
                <button
                  onClick={runAlgorithm}
                  disabled={isRunning || graph.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {graph.length === 0 ? 'Loading Graph...' : 'Run Algorithm'}
                </button>
                
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  disabled={!isRunning}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                
                <button
                  onClick={reset}
                  className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
                
                <button
                  onClick={startVehicle}
                  disabled={!result || isVehicleAnimating || result.path.length === 0}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Car className="w-4 h-4" />
                  Animate Vehicle
                </button>
              </div>
            </div>

            {/* Enhanced Live Stats */}
            {result && (
              <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold">Live Statistics</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Algorithm:</span>
                    <span className="font-semibold text-cyan-400">{result.algorithm.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Time:
                    </span>
                    <span className="font-semibold">{result.time.toFixed(2)} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Explored:</span>
                    <span className="font-semibold">{result.explored.length} nodes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Path:</span>
                    <span className="font-semibold">{result.path.length} nodes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Distance:</span>
                    <span className="font-semibold">{result.distance.toFixed(3)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className={`font-semibold ${result.path.length > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {result.path.length > 0 ? 'Path Found' : 'No Path'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Instructions */}
            <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
              <h3 className="font-semibold mb-2 text-sm">Map Controls</h3>
              <div className="text-xs text-slate-400 space-y-1">
                <div>• Click: Set Start Point</div>
                <div>• Shift+Click: Set End Point</div>
                <div>• Ctrl+Click: Toggle Road Block</div>
                <div>• Scroll: Zoom</div>
                <div>• Drag: Pan Map</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Map Area */}
        <div className="flex-1 flex flex-col">
          {/* Enhanced Top Bar */}
          <div className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-slate-400">Start (Click)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-slate-400">End (Shift+Click)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-slate-400">Explored</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-slate-400">Path</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-slate-400">All Nodes</span>
                </div>
              </div>
              <div className="text-sm text-slate-400">
                {graph.length > 0 ? `${graph.length} nodes loaded` : 'Loading graph...'}
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 relative">
            <div 
              ref={mapContainerRef} 
              className="w-full h-full"
              style={{ background: '#1e293b' }}
            />
            
            {/* Enhanced Status Overlay */}
            {isRunning && (
              <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
                  <span className="text-slate-300">
                    Step: {currentStep}/{result?.steps?.length || 0}
                  </span>
                </div>
              </div>
            )}
            
            {isVehicleAnimating && (
              <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 text-sm">
                  <Car className="w-4 h-4 text-orange-400" />
                  <span className="text-slate-300">
                    Vehicle: {Math.floor(vehiclePosition)}/{result?.path.length || 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartRoute360;