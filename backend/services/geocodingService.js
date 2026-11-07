// Geocoding Service: Nominatim OpenStreetMap with Throttling, Caching & Local POI Fallback
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for recent queries
const geocodeCache = new Map();
let lastRequestTime = 0;

// Local landmark fallback database across major Indian Metros and Regions
const FALLBACK_LOCATIONS = [
  // Hyderabad & Telangana
  { name: "HITEC City, Cyberabad, Hyderabad", lat: 17.4435, lng: 78.3772, address: "HITEC City, Madhapur, Hyderabad, Telangana 500081" },
  { name: "Gachibowli Financial District, Hyderabad", lat: 17.4401, lng: 78.3489, address: "Gachibowli, Hyderabad, Telangana 500032" },
  { name: "Secunderabad Railway Station", lat: 17.4334, lng: 78.5042, address: "Secunderabad, Hyderabad, Telangana 500003" },
  { name: "Charminar, Old City, Hyderabad", lat: 17.3616, lng: 78.4747, address: "Char Kaman, Ghansi Bazaar, Hyderabad, Telangana 500002" },

  // Bangalore / Bengaluru
  { name: "MG Road, Central Bengaluru", lat: 12.9756, lng: 77.6066, address: "Mahatma Gandhi Road, Bengaluru, Karnataka 560001" },
  { name: "Koramangala 5th Block, Bengaluru", lat: 12.9352, lng: 77.6245, address: "Koramangala, Bengaluru, Karnataka 560095" },
  { name: "Electronic City Phase 1, Bengaluru", lat: 12.8452, lng: 77.6602, address: "Electronic City, Bengaluru, Karnataka 560100" },
  { name: "Whitefield IT Hub, Bengaluru", lat: 12.9698, lng: 77.7500, address: "Whitefield, Bengaluru, Karnataka 560066" },

  // Chennai & Tamil Nadu
  { name: "T. Nagar Commercial Hub, Chennai", lat: 13.0418, lng: 80.2341, address: "Thyagaraya Nagar, Chennai, Tamil Nadu 600017" },
  { name: "Guindy Industrial Estate / Metro, Chennai", lat: 13.0067, lng: 80.2021, address: "Guindy, Chennai, Tamil Nadu 600032" },
  { name: "Marina Beach / Kamarajar Salai, Chennai", lat: 13.0500, lng: 80.2824, address: "Marina Beach Road, Chennai, Tamil Nadu 600005" },

  // Mumbai & Maharashtra
  { name: "Bandra Kurla Complex (BKC), Mumbai", lat: 19.0660, lng: 72.8687, address: "Bandra East, Mumbai, Maharashtra 400051" },
  { name: "Chhatrapati Shivaji Maharaj Terminus (CSMT), Mumbai", lat: 18.9401, lng: 72.8354, address: "Fort, Mumbai, Maharashtra 400001" },
  { name: "Andheri West Metro Hub, Mumbai", lat: 19.1197, lng: 72.8468, address: "SV Road, Andheri West, Mumbai, Maharashtra 400058" },
  { name: "Shivajinagar Central, Pune", lat: 18.5314, lng: 73.8446, address: "Shivajinagar, Pune, Maharashtra 411005" },

  // Delhi NCR
  { name: "Connaught Place (CP), New Delhi", lat: 28.6315, lng: 77.2167, address: "Inner Circle, Connaught Place, New Delhi 110001" },
  { name: "Cyber City DLF Phase 2, Gurugram", lat: 28.4952, lng: 77.0894, address: "DLF Cyber City, Gurugram, Haryana 122002" },
  { name: "Noida Sector 18 Commercial Hub", lat: 28.5708, lng: 77.3260, address: "Sector 18, Noida, Uttar Pradesh 201301" },

  // Vijayawada & AP
  { name: "Pandit Nehru Bus Station (PNBS), Vijayawada", lat: 16.5117, lng: 80.6186, address: "PNBS, Krishna River Road, Vijayawada, AP 520013" },
  { name: "Vijayawada Junction Railway Station", lat: 16.5183, lng: 80.6200, address: "Station Road, Governorpet, Vijayawada, AP 520002" },
  { name: "Benz Circle, Vijayawada", lat: 16.5015, lng: 80.6508, address: "NH-16 & MG Road Junction, Vijayawada, AP 520010" },
  { name: "Ramavarappadu Ring, Vijayawada", lat: 16.5255, lng: 80.6720, address: "NH-16 / Eluru Road Intersection, Vijayawada, AP 520008" },
  { name: "Kanaka Durga Temple, Indrakeeladri", lat: 16.5152, lng: 80.6063, address: "Indrakeeladri Hill, Mallikarjunapeta, Vijayawada, AP 520001" },
  { name: "Visakhapatnam RK Beach Road", lat: 17.7126, lng: 83.3197, address: "Beach Road, Visakhapatnam, AP 530002" }
];

export const searchLocations = async (query) => {
  if (!query || query.trim().length < 2) return [];
  const cleanQ = query.trim().toLowerCase();

  // Check cache first
  if (geocodeCache.has(cleanQ)) {
    return geocodeCache.get(cleanQ);
  }

  // 1. Try public Nominatim API with rate-limiting and Custom User-Agent
  try {
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    if (timeSinceLast < 1000) {
      await new Promise(r => setTimeout(r, 1000 - timeSinceLast));
    }
    lastRequestTime = Date.now();

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SmartRouteAI-Techthon/1.0 (academic.research.transportation)'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const results = data.map(item => ({
          name: item.display_name.split(',')[0],
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          source: 'nominatim_live'
        }));
        geocodeCache.set(cleanQ, results);
        return results;
      }
    }
  } catch (err) {
    // Graceful fallback to local landmark index
  }

  // 2. Fallback to Local Landmark matching
  const matched = FALLBACK_LOCATIONS.filter(item =>
    item.name.toLowerCase().includes(cleanQ) || item.address.toLowerCase().includes(cleanQ)
  );

  const results = matched.map(m => ({ ...m, source: 'known_poi_fallback' }));

  geocodeCache.set(cleanQ, results);
  return results;
};

export const reverseGeocode = async (lat, lng) => {
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  if (isNaN(numLat) || isNaN(numLng)) {
    throw new Error('Invalid coordinates for reverse geocoding');
  }

  const cacheKey = `rev_${numLat.toFixed(4)}_${numLng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  try {
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    if (timeSinceLast < 1000) {
      await new Promise(r => setTimeout(r, 1000 - timeSinceLast));
    }
    lastRequestTime = Date.now();

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${numLat}&lon=${numLng}&zoom=18&addressdetails=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SmartRouteAI-Techthon/1.0 (academic.research.transportation)'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const placeName = addr.road || addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village || (data.display_name ? data.display_name.split(',')[0] : null);
      
      const res = {
        name: placeName ? `${placeName}${addr.city ? `, ${addr.city}` : ''}` : (data.name || `Location (${numLat.toFixed(4)}, ${numLng.toFixed(4)})`),
        address: data.display_name || `GPS Coordinates: ${numLat.toFixed(5)}°N, ${numLng.toFixed(5)}°E`,
        lat: numLat,
        lng: numLng,
        source: 'nominatim_live'
      };
      geocodeCache.set(cacheKey, res);
      return res;
    }
  } catch (e) {
    // Graceful fallback below
  }

  // Find nearest local landmark if within 1.5 km
  let nearestLandmark = null;
  let minDistanceKm = Infinity;

  for (const loc of FALLBACK_LOCATIONS) {
    const dLat = (loc.lat - numLat) * 111;
    const dLng = (loc.lng - numLng) * 111 * Math.cos((numLat * Math.PI) / 180);
    const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
    if (distKm < minDistanceKm) {
      minDistanceKm = distKm;
      nearestLandmark = loc;
    }
  }

  if (nearestLandmark && minDistanceKm <= 1.5) {
    const fallback = {
      name: nearestLandmark.name,
      address: nearestLandmark.address,
      lat: numLat,
      lng: numLng,
      source: 'local_poi_index'
    };
    geocodeCache.set(cacheKey, fallback);
    return fallback;
  }

  // Accurate coordinate-based fallback without false landmark attribution
  const latStr = `${Math.abs(numLat).toFixed(4)}°${numLat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(numLng).toFixed(4)}°${numLng >= 0 ? 'E' : 'W'}`;
  const fallback = {
    name: `My GPS Location (${latStr}, ${lngStr})`,
    address: `GPS Coordinates: ${latStr}, ${lngStr}`,
    lat: numLat,
    lng: numLng,
    source: 'gps_coordinate_reference'
  };
  geocodeCache.set(cacheKey, fallback);
  return fallback;
};
