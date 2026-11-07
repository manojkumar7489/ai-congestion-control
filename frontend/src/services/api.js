/**
 * SmartRoute AI - Native Fetch API Client
 * Clean REST abstraction with JWT token injection and error handling
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('smartroute_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${res.status}`);
  }
  return await res.json();
};

export const api = {
  // Authentication
  auth: {
    register: async (data) => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    login: async (data) => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    getMe: async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    }
  },

  // Routes
  routes: {
    getAlternatives: async (payload) => {
      const res = await fetch(`${BASE_URL}/api/routes/alternatives`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse(res);
    },
    optimize: async (payload) => {
      const res = await fetch(`${BASE_URL}/api/routes/optimize`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse(res);
    },
    getHistory: async () => {
      const res = await fetch(`${BASE_URL}/api/routes/history`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    getJourneys: async () => {
      const res = await fetch(`${BASE_URL}/api/routes/journeys`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    saveJourney: async (journeyData) => {
      const res = await fetch(`${BASE_URL}/api/routes/save-journey`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(journeyData)
      });
      return handleResponse(res);
    }
  },

  // Traffic
  traffic: {
    getCurrent: async (lat, lng) => {
      const params = new URLSearchParams();
      if (lat) params.append('lat', lat);
      if (lng) params.append('lng', lng);
      const url = params.toString() ? `${BASE_URL}/api/traffic/current?${params.toString()}` : `${BASE_URL}/api/traffic/current`;
      const res = await fetch(url);
      return handleResponse(res);
    },
    getSegments: async () => {
      const res = await fetch(`${BASE_URL}/api/traffic/segments`);
      return handleResponse(res);
    },
    getStatus: async () => {
      const res = await fetch(`${BASE_URL}/api/traffic/status`);
      return handleResponse(res);
    },
    getForecast: async () => {
      const res = await fetch(`${BASE_URL}/api/traffic/forecast`);
      return handleResponse(res);
    }
  },

  // Simulation
  simulation: {
    run: async (vehicleCount = 300, scenario = 'rush_hour') => {
      const res = await fetch(`${BASE_URL}/api/simulation/run`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ vehicleCount, scenario })
      });
      return handleResponse(res);
    },
    getResults: async () => {
      const res = await fetch(`${BASE_URL}/api/simulation/results`);
      return handleResponse(res);
    }
  },

  // Weather
  weather: {
    getCurrent: async (lat, lng, scenario) => {
      const params = new URLSearchParams();
      if (lat) params.append('lat', lat);
      if (lng) params.append('lng', lng);
      if (scenario) params.append('scenario', scenario);
      const res = await fetch(`${BASE_URL}/api/weather/current?${params.toString()}`);
      return handleResponse(res);
    }
  },

  // Users
  users: {
    getProfile: async () => {
      const res = await fetch(`${BASE_URL}/api/users/profile`, { headers: getHeaders() });
      return handleResponse(res);
    },
    updateProfile: async (data) => {
      const res = await fetch(`${BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    getSavedLocations: async () => {
      const res = await fetch(`${BASE_URL}/api/users/saved-locations`, { headers: getHeaders() });
      return handleResponse(res);
    },
    addSavedLocation: async (data) => {
      const res = await fetch(`${BASE_URL}/api/users/saved-locations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    }
  },

  // Admin
  admin: {
    getSystemStatus: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/system-status`);
      return handleResponse(res);
    }
  },

  // Geocoding
  geocoding: {
    search: async (q) => {
      const res = await fetch(`${BASE_URL}/api/geocoding/search?q=${encodeURIComponent(q)}`);
      return handleResponse(res);
    },
    reverse: async (lat, lng) => {
      const res = await fetch(`${BASE_URL}/api/geocoding/reverse?lat=${lat}&lng=${lng}`);
      return handleResponse(res);
    },
    getIpLocation: async () => {
      const res = await fetch(`${BASE_URL}/api/geocoding/ip-location`);
      return handleResponse(res);
    }
  }
};
