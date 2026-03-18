# Smart Route 360

Smart Route 360 is an interactive pathfinding visualizer built with React, Vite, and Leaflet.
It loads a real road graph and compares multiple graph search algorithms with live map exploration, route drawing, and vehicle animation.

## Highlights

- Interactive map-based route selection
- Multiple algorithm support:
	- A*
	- Dijkstra
	- Bidirectional Dijkstra
	- BFS (Breadth-First Search)
	- Greedy Best-First Search
	- DFS (Depth-First Search)
- Live explored-node and final-route rendering
- Adjustable simulation settings:
	- Heuristic weight
	- Traffic weight
	- Vehicle speed
- Block/unblock nodes on the graph for obstacle simulation
- Realistic vehicle movement along the computed route
- Metrics panel with time, explored nodes, route size, and distance

## Tech Stack

- React 19
- Vite 7
- Leaflet
- Recharts
- Lucide React
- Tailwind CSS 4

## Controls

- Single click: set Start point
- Double click: set End point
- Ctrl + click: block or unblock nearest node
- Scroll: zoom map
- Drag: pan map

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open the local URL shown in terminal (usually http://localhost:5173).

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Data Pipeline

The route graph is loaded from:

- `src/graph.json`

If you need to regenerate graph data from GeoJSON, use the conversion script in:

- `scripts/convertGeoJSON.js`

Input example:

- `scripts/export.geojson`

## Project Structure

```text
.
|- public/
|- scripts/
|  |- convertGeoJSON.js
|  |- export.geojson
|- src/
|  |- App.jsx
|  |- copy1.jsx
|  |- graph.json
|  |- index.css
|  |- main.jsx
|  |- assets/
|- index.html
|- package.json
|- vite.config.js
```

## Notes

- The graph can be large, so production builds may show chunk-size warnings.
- Rendering is optimized by sampling background nodes while keeping route accuracy.

## Repository

GitHub: https://github.com/shiven365/Smart-Route

## License

This project is for educational and academic use.
