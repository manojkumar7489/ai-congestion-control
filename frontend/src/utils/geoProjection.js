/**
 * Web Mercator Projection & Geo Math Utilities (EPSG:3857)
 * Implements standard spherical mercator coordinate-to-pixel projection
 * without external mapping libraries.
 */

const TILE_SIZE = 256;

/**
 * Converts (lat, lng) to global world pixel coordinates at a given zoom level
 */
export function projectLatLngToWorldPixels(lat, lng, zoom) {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  
  // Constrain latitude within Mercator limits (-85.051129 to 85.051129)
  const clippedLat = Math.min(Math.max(lat, -85.05112878), 85.05112878);
  
  // Longitude to X
  const x = ((lng + 180) / 360) * scale;
  
  // Latitude to Y (Web Mercator formula)
  const sinLat = Math.sin((clippedLat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  
  return { x, y };
}

/**
 * Converts global world pixel coordinates back to (lat, lng) at a given zoom level
 */
export function unprojectWorldPixelsToLatLng(x, y, zoom) {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  
  const lng = (x / scale) * 360 - 180;
  
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  
  return { lat, lng };
}

/**
 * Converts geographic coordinate (lat, lng) to viewport screen pixel (px, py)
 * relative to container center and dimensions
 */
export function latLngToScreenPixel(lat, lng, centerLat, centerLng, zoom, width, height) {
  const centerWorld = projectLatLngToWorldPixels(centerLat, centerLng, zoom);
  const pointWorld = projectLatLngToWorldPixels(lat, lng, zoom);
  
  return {
    x: width / 2 + (pointWorld.x - centerWorld.x),
    y: height / 2 + (pointWorld.y - centerWorld.y)
  };
}

/**
 * Generates an SVG path `d` string from an array of [lat, lng] coordinates
 */
export function buildSvgPathFromCoords(coords, centerLat, centerLng, zoom, width, height) {
  if (!coords || coords.length === 0) return '';
  
  return coords.map((pt, i) => {
    const screen = latLngToScreenPixel(pt[0], pt[1], centerLat, centerLng, zoom, width, height);
    return `${i === 0 ? 'M' : 'L'} ${screen.x.toFixed(1)} ${screen.y.toFixed(1)}`;
  }).join(' ');
}

/**
 * Computes bounding box and optimal center & zoom to fit all coordinates in viewport
 */
export function calculateFitBounds(coordsList, width, height, padding = 40) {
  if (!coordsList || coordsList.length === 0) {
    return { center: { lat: 16.5062, lng: 80.6480 }, zoom: 13 };
  }

  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  
  coordsList.forEach(pt => {
    if (pt && pt.length >= 2) {
      minLat = Math.min(minLat, pt[0]);
      maxLat = Math.max(maxLat, pt[0]);
      minLng = Math.min(minLng, pt[1]);
      maxLng = Math.max(maxLng, pt[1]);
    }
  });

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // Compute required zoom level
  const latFraction = (maxLat - minLat) / 360;
  const lngFraction = (maxLng - minLng) / 360;

  const latZoom = Math.floor(Math.log2((height - padding * 2) / (TILE_SIZE * Math.max(latFraction, 0.0001))));
  const lngZoom = Math.floor(Math.log2((width - padding * 2) / (TILE_SIZE * Math.max(lngFraction, 0.0001))));

  const zoom = Math.max(11, Math.min(16, Math.min(latZoom, lngZoom)));

  return {
    center: { lat: centerLat, lng: centerLng },
    zoom
  };
}
