/**
 * TomTom Traffic Service
 * Uses TRAFFIC_API_KEY to fetch live traffic flow segments and incident telemetry
 * Includes smart in-memory caching to optimize API quota usage and prevent rate-limiting.
 */

const tomtomCache = new Map();
const CACHE_TTL_MS = 120000; // 2 minutes cache

/**
 * Gets live traffic flow for a specific coordinate
 */
export async function getTomTomTrafficFlow(lat, lng) {
  const apiKey = process.env.TRAFFIC_API_KEY;
  if (!apiKey || isNaN(lat) || isNaN(lng)) return null;

  const cacheKey = `flow_${lat.toFixed(3)}_${lng.toFixed(3)}`;
  const cached = tomtomCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const flow = data.flowSegmentData;
      if (flow) {
        const currentSpeed = flow.currentSpeed || 30;
        const freeFlowSpeed = flow.freeFlowSpeed || 45;
        const speedRatio = Math.min(1.0, currentSpeed / Math.max(1, freeFlowSpeed));
        const congestionIndex = Math.round(Math.max(0.1, Math.min(0.95, 1.0 - speedRatio + 0.1)) * 100) / 100;

        const result = {
          currentSpeedKmh: currentSpeed,
          freeFlowSpeedKmh: freeFlowSpeed,
          currentTravelTimeSecs: flow.currentTravelTime,
          freeFlowTravelTimeSecs: flow.freeFlowTravelTime,
          confidence: flow.confidence,
          roadClosure: flow.roadClosure,
          congestionIndex,
          source: 'TOMTOM_LIVE_API'
        };

        tomtomCache.set(cacheKey, { timestamp: Date.now(), data: result });
        return result;
      }
    }
  } catch (err) {
    // Graceful fallback if network or rate limit happens
  }

  return null;
}

/**
 * Gets live incidents in a bounding box around the routes
 */
export async function getTomTomIncidents(minLat, minLng, maxLat, maxLng) {
  const apiKey = process.env.TRAFFIC_API_KEY;
  if (!apiKey) return [];

  const cacheKey = `incidents_${minLat.toFixed(2)}_${minLng.toFixed(2)}_${maxLat.toFixed(2)}_${maxLng.toFixed(2)}`;
  const cached = tomtomCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    // TomTom format: minLon,minLat,maxLon,maxLat
    const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
    const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${bbox}&fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description}}}}&language=en-GB&key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.incidents)) {
        const incidents = data.incidents.slice(0, 10).map((inc, idx) => {
          const coords = inc.geometry?.coordinates?.[0] || [minLng, minLat];
          const desc = inc.properties?.events?.[0]?.description || 'Traffic Congestion Delay';
          const delayMag = inc.properties?.magnitudeOfDelay || 2;
          return {
            incident_id: `tomtom-inc-${idx + 1}`,
            title: desc,
            impact: delayMag > 2 ? 'Heavy traffic delays detected' : 'Moderate slowdown',
            severity: delayMag > 2 ? 'high' : 'medium',
            road_name: 'Corridor Traffic Zone',
            lat: coords[1],
            lng: coords[0]
          };
        });

        tomtomCache.set(cacheKey, { timestamp: Date.now(), data: incidents });
        return incidents;
      }
    }
  } catch (err) {
    // Fallback
  }

  return [];
}
