/**
 * SmartRoute AI - Robust Browser Geolocation Helper
 * Handles two-stage fallback (high accuracy -> standard Wi-Fi/cell accuracy),
 * continuous watch fallback, bearing calculation, and diagnostic messaging.
 */

import { getBearingDegrees, getDistanceMeters } from './navigationMath';

/**
 * Gets the user's current GPS/device coordinates with automatic two-stage fallback
 */
export async function getCurrentUserPosition() {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser.');
  }

  // Stage 1: Try high accuracy first (5s timeout)
  try {
    return await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading ?? null,
          speed: pos.coords.speed ?? 0,
          timestamp: pos.timestamp,
          source: 'high_accuracy_gps'
        }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 5000 }
      );
    });
  } catch (err) {
    // If permission was explicitly denied, do not retry
    if (err.code === 1) { // PERMISSION_DENIED
      throw new Error('Location permission was denied. Please allow location access in your browser settings.');
    }

    // Stage 2: Fallback to standard/Wi-Fi/network accuracy (8s timeout, allow cached up to 60s)
    try {
      return await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ?? 0,
            timestamp: pos.timestamp,
            source: 'standard_network_location'
          }),
          (fallbackErr) => reject(fallbackErr),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      });
    } catch (fallbackErr) {
      if (fallbackErr.code === 1) {
        throw new Error('Location permission was denied. Please allow location access in your browser settings.');
      } else if (fallbackErr.code === 2) {
        throw new Error('Device location is currently unavailable. Please verify GPS or Wi-Fi connectivity.');
      } else if (fallbackErr.code === 3) {
        throw new Error('Location request timed out. Please try again or search for your origin.');
      }
      throw new Error(fallbackErr.message || 'Unable to retrieve your current location.');
    }
  }
}

/**
 * Creates a resilient GPS watcher with automatic fallback from high to standard accuracy
 */
export function startRobustGpsWatch({ onPosition, onError }) {
  if (!navigator.geolocation) {
    if (onError) onError(new Error('Geolocation is not supported by this browser.'));
    return () => {};
  }

  let activeWatchId = null;
  let hasFallenBack = false;
  let lastCoord = null;

  const handleCoords = (pos) => {
    const coords = pos.coords;
    const lat = coords.latitude;
    const lng = coords.longitude;
    const speed = coords.speed ? Math.round(coords.speed * 3.6) : 0;

    let heading = coords.heading;
    if (heading === null || heading === undefined || isNaN(heading)) {
      if (lastCoord) {
        const dist = getDistanceMeters(lastCoord.lat, lastCoord.lng, lat, lng);
        if (dist > 3) {
          heading = getBearingDegrees(lastCoord.lat, lastCoord.lng, lat, lng);
        } else {
          heading = lastCoord.heading || 0;
        }
      } else {
        heading = 0;
      }
    }

    lastCoord = { lat, lng, heading, speed };

    if (onPosition) {
      onPosition({
        lat,
        lng,
        heading,
        speed,
        accuracy: coords.accuracy,
        timestamp: pos.timestamp,
        source: hasFallenBack ? 'standard_network' : 'high_accuracy_gps'
      });
    }
  };

  const startWatcher = (highAccuracy) => {
    try {
      activeWatchId = navigator.geolocation.watchPosition(
        handleCoords,
        (err) => {
          // If high accuracy failed due to timeout or unavailability, downgrade once
          if (!hasFallenBack && (err.code === 3 || err.code === 2)) {
            hasFallenBack = true;
            if (activeWatchId !== null) {
              navigator.geolocation.clearWatch(activeWatchId);
            }
            startWatcher(false);
            return;
          }

          if (onError) {
            let msg = err.message;
            if (err.code === 1) msg = 'Location permission denied by user.';
            else if (err.code === 2) msg = 'Location signal currently unavailable.';
            else if (err.code === 3) msg = 'Location acquisition timed out.';
            onError(new Error(msg));
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 10000 : 15000,
          maximumAge: highAccuracy ? 2000 : 10000
        }
      );
    } catch (e) {
      if (onError) onError(e);
    }
  };

  // Start with high accuracy
  startWatcher(true);

  // Return unsubscribe cleanup function
  return () => {
    if (activeWatchId !== null) {
      navigator.geolocation.clearWatch(activeWatchId);
      activeWatchId = null;
    }
  };
}
