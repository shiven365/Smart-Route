import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import osmData from '../graph.json';
import { loadOSMGraph, findNearestNode } from '../utils/graphUtils';

export const useMapInit = (
  mapContainerRef, 
  mapRef, 
  graphRef, 
  nodeByIdRef, 
  mapStyle, 
  setStartNode, 
  setEndNode, 
  setBlockedNodes
) => {
  const clickTimeoutRef = useRef(null);
  
  const [graph, setGraph] = useState([]);
  const [graphEdgeCount, setGraphEdgeCount] = useState(0);

  // Load graph data
  useEffect(() => {
    console.log("Loading graph data...");
    
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
  }, [graphRef, nodeByIdRef]);

  useEffect(() => {
    graphRef.current = graph;
  }, [graph, graphRef]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    const map = L.map(mapContainerRef.current, {
      center: [23.0225, 72.5714],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: false
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
    
    const clearPendingStartSelection = () => {
      if (clickTimeoutRef.current) {
        window.clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      
      if (e.originalEvent.ctrlKey) {
        clearPendingStartSelection();
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
      } else {
        clearPendingStartSelection();
        clickTimeoutRef.current = window.setTimeout(() => {
          setStartNode({ lat, lng });
          clickTimeoutRef.current = null;
        }, 220);
      }
    });

    map.on('dblclick', (e) => {
      const { lat, lng } = e.latlng;
      clearPendingStartSelection();
      setEndNode({ lat, lng });
    });

    return () => {
      clearPendingStartSelection();
      
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapContainerRef, mapRef, graphRef, setStartNode, setEndNode, setBlockedNodes]);

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
    
    L.tileLayer(tileUrls[mapStyle] || tileUrls.streets, {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
  }, [mapStyle, mapRef]);

  return { graph, graphEdgeCount };
};
