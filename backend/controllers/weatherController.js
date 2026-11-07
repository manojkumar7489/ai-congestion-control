import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let demoWeather = {
  condition: "Partly Cloudy with Humid Breeze",
  temp_c: 32.4,
  humidity: 62,
  precipitation_mm: 0.0,
  wind_kph: 14.5,
  visibility_km: 9.5,
  traffic_impact_factor: 1.05,
  description: "Standard driving conditions. Roads dry and visibility high.",
  source: "DEMO_SCENARIO"
};

try {
  const filePath = path.resolve(__dirname, '../../data/demo/vijayawada_traffic.json');
  if (fs.existsSync(filePath)) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (raw.weather_scenarios?.clear) {
      demoWeather = { ...raw.weather_scenarios.clear, source: "DEMO_SCENARIO" };
    }
  }
} catch (e) {}

const OWM_KEY = process.env.WEATHER_API_KEY;

const weatherCodeToDesc = (code) => {
  if (code >= 200 && code < 300) return { cond: 'Thunderstorm', impact: 1.45, desc: 'Thunderstorm active. Severe speed reduction expected.' };
  if (code >= 300 && code < 400) return { cond: 'Drizzle', impact: 1.15, desc: 'Light drizzle. Slightly slippery roads.' };
  if (code >= 500 && code < 600) return { cond: 'Rain', impact: 1.30, desc: 'Rainfall detected. Expect 20-30% speed reduction.' };
  if (code >= 600 && code < 700) return { cond: 'Snow/Hail', impact: 1.55, desc: 'Extreme caution - hail or icy conditions.' };
  if (code >= 700 && code < 800) return { cond: 'Foggy / Low Visibility', impact: 1.25, desc: 'Reduced visibility. Drive carefully.' };
  if (code === 800) return { cond: 'Clear Sky', impact: 1.0, desc: 'Excellent driving conditions.' };
  return { cond: 'Partly Cloudy', impact: 1.05, desc: 'Normal driving conditions.' };
};

export const getCurrentWeather = async (req, res) => {
  const { lat = 16.5062, lng = 80.6480, scenario } = req.query;

  // Allow switching weather scenarios in Demo Mode
  if (scenario) {
    try {
      const filePath = path.resolve(__dirname, '../../data/demo/vijayawada_traffic.json');
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (raw.weather_scenarios?.[scenario]) {
        return res.json({
          success: true,
          mode: 'DEMO SIMULATION SCENARIO',
          weather: { ...raw.weather_scenarios[scenario], selected_scenario: scenario }
        });
      }
    } catch (e) {}
  }

  // Attempt OpenWeatherMap live API (uses WEATHER_API_KEY)
  if (OWM_KEY) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OWM_KEY}&units=metric`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const weatherCode = data.weather?.[0]?.id || 800;
        const { cond, impact, desc } = weatherCodeToDesc(weatherCode);
        return res.json({
          success: true,
          mode: 'LIVE WEATHER DATA (OpenWeatherMap)',
          weather: {
            condition: cond,
            description: data.weather?.[0]?.description || desc,
            temp_c: Math.round(data.main?.temp * 10) / 10,
            feels_like_c: Math.round(data.main?.feels_like * 10) / 10,
            humidity: data.main?.humidity || 60,
            wind_kph: Math.round((data.wind?.speed || 0) * 3.6 * 10) / 10,
            visibility_km: Math.round(((data.visibility || 10000) / 1000) * 10) / 10,
            precipitation_mm: data.rain?.['1h'] || 0.0,
            traffic_impact_factor: impact,
            city_name: data.name || '',
            icon_code: data.weather?.[0]?.icon || '01d',
            ai_traffic_note: desc,
            source: 'OPENWEATHERMAP_LIVE'
          }
        });
      }
    } catch (e) {
      // Fallback to Open-Meteo free API below
    }
  }

  // Fallback: Free Open-Meteo (no API key needed)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=precipitation,relativehumidity_2m`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const curr = data.current_weather;
      if (curr) {
        const { cond, impact, desc } = curr.weathercode > 50
          ? { cond: 'Rainstorm', impact: 1.35, desc: 'Rainfall detected. Speeds may be reduced by 20-30%.' }
          : { cond: 'Clear / Partly Cloudy', impact: 1.0, desc: 'Good visibility and normal road traction.' };
        return res.json({
          success: true,
          mode: 'LIVE WEATHER DATA (Open-Meteo)',
          weather: {
            condition: cond,
            temp_c: curr.temperature,
            wind_kph: curr.windspeed,
            precipitation_mm: data.hourly?.precipitation?.[0] || 0.0,
            humidity: data.hourly?.relativehumidity_2m?.[0] || 60,
            visibility_km: 10.0,
            traffic_impact_factor: impact,
            description: desc,
            source: 'OPEN_METEO_LIVE'
          }
        });
      }
    }
  } catch (e) {}

  res.json({ success: true, mode: 'DEMO SIMULATION DATA', weather: demoWeather });
};
