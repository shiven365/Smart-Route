import { haversine } from "./mathUtils";

// Graph Node
export class Node {
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
export const loadOSMGraph = (data) => {
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

export const MAX_BACKGROUND_NODES = 4000;

export const sampleNodesForRendering = (nodes, limit = MAX_BACKGROUND_NODES) => {
  if (!Array.isArray(nodes) || nodes.length <= limit) {
    return nodes;
  }

  const stride = Math.ceil(nodes.length / limit);
  return nodes.filter((_, index) => index % stride === 0);
};

export const calculatePathDistance = (path, nodeByIdMap) => {
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

export const CAR_HEADING_OFFSET_DEG = -90;

export const findNearestNode = (lat, lng, graph) => {
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

