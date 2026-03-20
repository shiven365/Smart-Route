const fs = require('fs');

const p = "c:\\Users\\Shiven\\Downloads\\DAA ino\\DAA ino\\src\\App.jsx";
const code = fs.readFileSync(p, 'utf-8');

const mathNames = ['haversine', 'interpolateLatLng', 'calculateBearing', 'shortestAngleDelta', 'lerpAngle'];
const pqName = 'PriorityQueue';
const graphNames = ['Node', 'loadOSMGraph', 'MAX_BACKGROUND_NODES', 'sampleNodesForRendering', 'calculatePathDistance', 'findNearestNode', 'CAR_HEADING_OFFSET_DEG'];
const algoNames = ['aStarAlgorithm', 'dijkstraAlgorithm', 'bidirectionalDijkstra', 'bfsAlgorithm', 'greedyBFS', 'dfsAlgorithm'];

const splitLines = code.split('\n');
const reactCompIndex = splitLines.findIndex(l => l.includes('const SmartRoute360 = () => {'));
const startIdx = splitLines.findIndex(l => l.includes('// Haversine distance calculator'));

const funcsLines = splitLines.slice(startIdx, reactCompIndex);

let mathUtilsCode = '';
let priorityQueueCode = '';
let graphUtilsCode = 'import { haversine } from "./mathUtils";\n\n';
let algoCode = 'import { PriorityQueue } from "../utils/PriorityQueue";\nimport { haversine } from "../utils/mathUtils";\nimport { findNearestNode } from "../utils/graphUtils";\n\n';

let currentTarget = null;
let currentCode = [];

for (let i = 0; i < funcsLines.length; i++) {
  const line = funcsLines[i];
  
  if (line.includes('// Haversine distance calculator') || line.includes('const haversine =') || line.includes('const interpolateLatLng =') || line.includes('const calculateBearing =') || line.includes('const shortestAngleDelta =') || line.includes('const lerpAngle =')) {
    currentTarget = 'math';
  } else if (line.includes('// Priority Queue') || line.includes('class PriorityQueue')) {
    currentTarget = 'pq';
  } else if (line.includes('// Graph Node') || line.includes('class Node') || line.includes('const loadOSMGraph =') || line.includes('const MAX_BACKGROUND_NODES =') || line.includes('const sampleNodesForRendering =') || line.includes('const calculatePathDistance =') || line.includes('const CAR_HEADING_OFFSET_DEG =') || line.includes('const findNearestNode =')) {
    currentTarget = 'graph';
  } else if (line.includes('const aStarAlgorithm =') || line.includes('const dijkstraAlgorithm =') || line.includes('const bidirectionalDijkstra =') || line.includes('// BFS Algorithm') || line.includes('const bfsAlgorithm =') || line.includes('// Greedy Best-First Search') || line.includes('const greedyBFS =') || line.includes('// DFS Algorithm') || line.includes('const dfsAlgorithm =')) {
    currentTarget = 'algo';
  }

  // Handle exports easily: just add 'export ' before const, class
  let modifiedLine = line;
  if (modifiedLine.startsWith('const ') || modifiedLine.startsWith('class ')) {
    modifiedLine = 'export ' + modifiedLine;
  }

  if (currentTarget === 'math') mathUtilsCode += modifiedLine + '\n';
  else if (currentTarget === 'pq') priorityQueueCode += modifiedLine + '\n';
  else if (currentTarget === 'graph') graphUtilsCode += modifiedLine + '\n';
  else if (currentTarget === 'algo') algoCode += modifiedLine + '\n';
}

fs.writeFileSync('c:\\Users\\Shiven\\Downloads\\DAA ino\\DAA ino\\src\\utils\\mathUtils.js', mathUtilsCode);
fs.writeFileSync('c:\\Users\\Shiven\\Downloads\\DAA ino\\DAA ino\\src\\utils\\PriorityQueue.js', priorityQueueCode);
fs.writeFileSync('c:\\Users\\Shiven\\Downloads\\DAA ino\\DAA ino\\src\\utils\\graphUtils.js', graphUtilsCode);
fs.writeFileSync('c:\\Users\\Shiven\\Downloads\\DAA ino\\DAA ino\\src\\algorithms\\pathfinding.js', algoCode);

const importsString = `
import { haversine, interpolateLatLng, calculateBearing, shortestAngleDelta, lerpAngle } from './utils/mathUtils';
import { PriorityQueue } from './utils/PriorityQueue';
import { loadOSMGraph, sampleNodesForRendering, calculatePathDistance, findNearestNode, CAR_HEADING_OFFSET_DEG, MAX_BACKGROUND_NODES } from './utils/graphUtils';
import { aStarAlgorithm, dijkstraAlgorithm, bidirectionalDijkstra, bfsAlgorithm, greedyBFS, dfsAlgorithm } from './algorithms/pathfinding';
`;

const newAppJsx = splitLines.slice(0, startIdx).join('\n') + importsString + '\n' + splitLines.slice(reactCompIndex).join('\n');
fs.writeFileSync(p, newAppJsx);

console.log("Refactoring complete");
