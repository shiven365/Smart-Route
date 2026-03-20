import { PriorityQueue } from "../utils/PriorityQueue";
import { haversine } from "../utils/mathUtils";
import { findNearestNode } from "../utils/graphUtils";

export const aStarAlgorithm = (graph, startLat, startLng, endLat, endLng, heuristicWeight = 1, trafficWeight = 1, blockedNodes = []) => {
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

export const dijkstraAlgorithm = (graph, startLat, startLng, endLat, endLng, trafficWeight = 1, blockedNodes = []) => {
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

export const bidirectionalDijkstra = (graph, startLat, startLng, endLat, endLng, trafficWeight = 1, blockedNodes = []) => {
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
export const bfsAlgorithm = (graph, startLat, startLng, endLat, endLng, blockedNodes = []) => {
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
export const greedyBFS = (graph, startLat, startLng, endLat, endLng, blockedNodes = []) => {
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
export const dfsAlgorithm = (graph, startLat, startLng, endLat, endLng, blockedNodes = []) => {
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



