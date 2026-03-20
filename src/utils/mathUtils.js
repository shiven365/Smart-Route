// Haversine distance calculator
export const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dlng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dlng/2) * Math.sin(dlng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const interpolateLatLng = (start, end, t) => {
  return [
    start[0] + ((end[0] - start[0]) * t),
    start[1] + ((end[1] - start[1]) * t)
  ];
};

export const calculateBearing = (fromLat, fromLng, toLat, toLng) => {
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

export const shortestAngleDelta = (from, to) => {
  return ((to - from + 540) % 360) - 180;
};

export const lerpAngle = (from, to, t) => {
  return (from + (shortestAngleDelta(from, to) * t) + 360) % 360;
};

