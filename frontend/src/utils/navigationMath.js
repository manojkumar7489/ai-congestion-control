/**
 * SmartRoute AI - Navigation & GPS Geometry Math Utilities
 * Implements high-performance distance calculation, cross-track off-route detection,
 * bearing heading calculation, and turn-by-turn progress matching without external libraries.
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates great-circle distance between two coordinates in meters (Haversine formula)
 */
export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates bearing / compass heading angle (in degrees 0-360) between two points
 */
export function getBearingDegrees(lat1, lon1, lat2, lon2) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const radians = Math.atan2(y, x);
  return (radians * 180 / Math.PI + 360) % 360;
}

/**
 * Projects a point onto a line segment [p1, p2] and returns distance in meters
 */
function distanceToSegment(p, p1, p2) {
  const latP = p[0], lonP = p[1];
  const lat1 = p1[0], lon1 = p1[1];
  const lat2 = p2[0], lon2 = p2[1];

  // Vector v = p2 - p1
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  if (dLat === 0 && dLon === 0) {
    return {
      distance: getDistanceMeters(latP, lonP, lat1, lon1),
      projection: [lat1, lon1],
      t: 0
    };
  }

  // Vector u = p - p1
  const t = Math.max(
    0,
    Math.min(
      1,
      ((latP - lat1) * dLat + (lonP - lon1) * dLon) /
        (dLat * dLat + dLon * dLon)
    )
  );

  const projLat = lat1 + t * dLat;
  const projLon = lon1 + t * dLon;

  return {
    distance: getDistanceMeters(latP, lonP, projLat, projLon),
    projection: [projLat, projLon],
    t
  };
}

/**
 * Finds the nearest point along the entire route geometry to detect cross-track distance
 */
export function findNearestPointOnRoute(userPos, routeGeometry) {
  if (!routeGeometry || routeGeometry.length < 2) {
    return { distanceMeters: 0, segmentIndex: 0, projection: userPos };
  }

  let minDistance = Infinity;
  let bestSegmentIndex = 0;
  let bestProjection = routeGeometry[0];

  for (let i = 0; i < routeGeometry.length - 1; i++) {
    const p1 = routeGeometry[i];
    const p2 = routeGeometry[i + 1];
    const { distance, projection } = distanceToSegment(userPos, p1, p2);

    if (distance < minDistance) {
      minDistance = distance;
      bestSegmentIndex = i;
      bestProjection = projection;
    }
  }

  return {
    distanceMeters: Math.round(minDistance),
    segmentIndex: bestSegmentIndex,
    projection: bestProjection
  };
}

/**
 * Calculates remaining distance along route from user's current position to destination
 */
export function calculateRemainingRouteDistance(userPos, routeGeometry, segmentIndex) {
  if (!routeGeometry || routeGeometry.length === 0) return 0;
  if (segmentIndex >= routeGeometry.length - 1) {
    const last = routeGeometry[routeGeometry.length - 1];
    return getDistanceMeters(userPos[0], userPos[1], last[0], last[1]);
  }

  // Distance from user to end of current segment
  const nextNode = routeGeometry[segmentIndex + 1];
  let totalMeters = getDistanceMeters(userPos[0], userPos[1], nextNode[0], nextNode[1]);

  // Sum remaining segments to destination
  for (let i = segmentIndex + 1; i < routeGeometry.length - 1; i++) {
    const p1 = routeGeometry[i];
    const p2 = routeGeometry[i + 1];
    totalMeters += getDistanceMeters(p1[0], p1[1], p2[0], p2[1]);
  }

  return Math.round(totalMeters);
}

/**
 * Identifies upcoming turn instruction and distance to that turn
 */
export function getUpcomingManeuver(userPos, steps = [], remainingMetersTotal = 0) {
  if (!steps || steps.length === 0) {
    return {
      currentStep: { instruction: 'Continue on planned route', modifier: 'straight' },
      distanceToTurnMeters: remainingMetersTotal,
      nextStep: null
    };
  }

  // Find the first step whose location is in front of the user
  let activeIndex = 0;
  let minTurnDistance = Infinity;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.location && step.location.length === 2) {
      const dist = getDistanceMeters(userPos[0], userPos[1], step.location[0], step.location[1]);
      // If turn is within 25 meters, consider user at this turn
      if (dist < minTurnDistance && dist > 15) {
        minTurnDistance = dist;
        activeIndex = i;
        break;
      }
    }
  }

  const currentStep = steps[activeIndex] || steps[0];
  const nextStep = steps[activeIndex + 1] || null;
  const turnDist = minTurnDistance < Infinity ? Math.round(minTurnDistance) : Math.min(350, remainingMetersTotal);

  return {
    currentStep,
    distanceToTurnMeters: turnDist,
    nextStep
  };
}
