import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { sampleNodesForRendering } from '../utils/graphUtils';

export const useMapOverlays = (
  mapRef, 
  graph, 
  startNode, 
  endNode, 
  result, 
  currentStep, 
  blockedNodes, 
  multiResults, 
  isRunning,
  nodeByIdRef,
  hasFittedPathRef,
  markersRef,
  polylinesRef
) => {
  const [renderedBackgroundNodeCount, setRenderedBackgroundNodeCount] = useState(0);
  const backgroundMarkersRef = useRef([]);

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

    return () => {
      backgroundMarkersRef.current.forEach((marker) => marker.remove());
      backgroundMarkersRef.current = [];
    };
  }, [graph, mapRef]);

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

    if (multiResults && multiResults.length > 0) {
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

    if (blockedNodes && blockedNodes.length > 0) {
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
    }

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

  }, [graph, startNode, endNode, result, currentStep, blockedNodes, multiResults, isRunning, mapRef, nodeByIdRef, hasFittedPathRef, markersRef, polylinesRef]);

  // Clean up all markers on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      polylinesRef.current.forEach((polyline) => polyline.remove());
      polylinesRef.current = [];
    };
  }, [markersRef, polylinesRef]);

  return { renderedBackgroundNodeCount };
};
