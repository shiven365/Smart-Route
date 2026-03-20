import { useEffect } from 'react';
import L from 'leaflet';
import { haversine, interpolateLatLng, calculateBearing, shortestAngleDelta, lerpAngle } from '../utils/mathUtils';
import { CAR_HEADING_OFFSET_DEG } from '../utils/graphUtils';

export const useVehicle = (
  mapRef, 
  result, 
  speed, 
  nodeByIdRef,
  isVehicleAnimating,
  setIsVehicleAnimating,
  setVehiclePosition,
  vehicleAnimationRef,
  vehicleMarkerRef,
  vehicleTrailRef
) => {

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
    }

    setVehiclePosition(0);
    vehicleAnimationRef.current = window.requestAnimationFrame(animateVehicle);
    
    return () => {
      if (vehicleAnimationRef.current) {
        window.cancelAnimationFrame(vehicleAnimationRef.current);
        vehicleAnimationRef.current = null;
      }
    };
  }, [isVehicleAnimating, result, speed, mapRef, nodeByIdRef, setIsVehicleAnimating, setVehiclePosition, vehicleAnimationRef, vehicleMarkerRef, vehicleTrailRef]);

  const startVehicle = () => {
    if (result && result.path && result.path.length > 1) {
      setVehiclePosition(0);
      setIsVehicleAnimating(true);
      console.log("Vehicle animation started");
    } else {
      console.warn("No path available for vehicle animation");
    }
  };

  return { startVehicle };
};
