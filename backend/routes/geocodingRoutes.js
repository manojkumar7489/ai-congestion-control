import express from 'express';
import { searchLocations, reverseGeocode } from '../services/geocodingService.js';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, results: [] });
    const results = await searchLocations(q);
    res.json({ success: true, count: results.length, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'Lat and lng required' });
    const result = await reverseGeocode(parseFloat(lat), parseFloat(lng));
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/ip-location', async (req, res) => {
  try {
    const rawIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '';
    const cleanIp = rawIp.replace(/^.*:/, '').trim();
    const isPrivate = !cleanIp || cleanIp === '1' || cleanIp === '127.0.0.1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.');

    const targetUrl = isPrivate ? 'http://ip-api.com/json/' : `http://ip-api.com/json/${cleanIp}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const ipRes = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (ipRes.ok) {
      const data = await ipRes.json();
      if (data.status === 'success' && data.lat && data.lon) {
        return res.json({
          success: true,
          location: {
            name: `${data.city || 'Local Area'}, ${data.regionName || data.country || ''}`.trim(),
            address: `${data.city || ''}, ${data.regionName || ''}, ${data.country || ''}`.trim(),
            lat: data.lat,
            lng: data.lon,
            city: data.city,
            source: 'network_ip_location'
          }
        });
      }
    }

    res.json({
      success: true,
      location: {
        name: 'Detected Local Hub',
        address: 'Current City Center',
        lat: 16.5062,
        lng: 80.6480,
        source: 'default_reference'
      }
    });
  } catch (err) {
    res.json({
      success: true,
      location: {
        name: 'Detected Local Hub',
        address: 'Current City Center',
        lat: 16.5062,
        lng: 80.6480,
        source: 'default_reference'
      }
    });
  }
});

export default router;
