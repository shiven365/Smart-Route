import fs from "fs";
import haversine from "haversine-distance";

// Load GeoJSON
const geojson = JSON.parse(fs.readFileSync("./export.geojson", "utf-8"));

// Map to store unique nodes
const nodes = {};
let idCounter = 1;

// Helper to get node ID for a coordinate
function getNodeId(lat, lng) {
  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`; // rounding avoids duplicates
  if (!nodes[key]) {
    nodes[key] = { id: String(idCounter++), lat, lng, neighbors: [] };
  }
  return nodes[key].id;
}

// Build graph from LineStrings
geojson.features.forEach(feature => {
  if (feature.geometry.type === "LineString") {
    const coords = feature.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];

      const id1 = getNodeId(lat1, lng1);
      const id2 = getNodeId(lat2, lng2);

      const dist = haversine({ lat: lat1, lon: lng1 }, { lat: lat2, lon: lng2 });

      nodes[`${lat1.toFixed(6)},${lng1.toFixed(6)}`].neighbors.push({ id: id2, weight: dist });
      nodes[`${lat2.toFixed(6)},${lng2.toFixed(6)}`].neighbors.push({ id: id1, weight: dist });
    }
  }
});

// Save the graph as JSON
fs.writeFileSync("./graph.json", JSON.stringify(Object.values(nodes), null, 2));
console.log(`✅ Graph created with ${Object.keys(nodes).length} nodes`);
