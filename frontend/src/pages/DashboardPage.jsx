import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import MapView from '../components/MapView';
import { HourlyTrafficChart, PredictionForecastChart } from '../components/SvgCharts';

export default function DashboardPage({ setActivePage }) {
  const [trafficData, setTrafficData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [traffic, weather, forecast, history] = await Promise.all([
          api.traffic.getCurrent(),
          api.weather.getCurrent(),
          api.traffic.getForecast(),
          api.routes.getHistory()
        ]);

        if (traffic.success) setTrafficData(traffic);
        if (weather.success) setWeatherData(weather.weather);
        if (forecast.success) setForecastData(forecast);
        if (history.success) setHistoryData(history.history || []);
      } catch (err) {
        console.warn('Dashboard fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const overview = trafficData?.overview || {
    average_congestion_index: 0.48,
    average_speed_kmh: 28,
    total_active_delay_mins: 18,
    active_incidents_count: 2,
    road_network_health: 'MODERATELY_CONGESTED'
  };

  const isCongested = overview.average_congestion_index > 0.65;
  const isModerate = overview.average_congestion_index > 0.35 && !isCongested;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* TOP STATS CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Network Congestion Index</div>
          <div className="stat-value" style={{ color: isCongested ? '#ef4444' : (isModerate ? '#f59e0b' : '#10b981') }}>
            {Math.round(overview.average_congestion_index * 100)}%
          </div>
          <div className="stat-subtext">
            Status: <span style={{ fontWeight: 600, color: '#f8fafc' }}>{overview.road_network_health}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">City Arterial Average Speed</div>
          <div className="stat-value" style={{ color: '#60a5fa' }}>
            {overview.average_speed_kmh} <span style={{ fontSize: '14px', color: '#94a3b8' }}>km/h</span>
          </div>
          <div className="stat-subtext">Free-flow nominal: 50 km/h</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Bottleneck Delays</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {overview.total_active_delay_mins} <span style={{ fontSize: '14px', color: '#94a3b8' }}>mins</span>
          </div>
          <div className="stat-subtext">Cumulative across 8 corridors</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Reported Road Incidents</div>
          <div className="stat-value" style={{ color: overview.active_incidents_count > 0 ? '#ef4444' : '#10b981' }}>
            {overview.active_incidents_count} <span style={{ fontSize: '14px', color: '#94a3b8' }}>events</span>
          </div>
          <div className="stat-subtext">Benz Circle & Gunadala</div>
        </div>
      </div>

      {/* MAP & QUICK PLANNER CTA */}
      <div className="grid-2">
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h3 className="card-title">🗺️ {trafficData?.city || 'Regional'} Arterial Road Network</h3>
            <span className="badge badge-blue">{trafficData?.is_live ? 'Live TomTom Telemetry' : 'Interactive OSM'}</span>
          </div>
          <MapView
            incidents={trafficData?.incidents || []}
            roadSegments={trafficData?.segments || []}
            showTrafficHeatmap={true}
            height="360px"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Base: OpenStreetMap Engine | Status: {trafficData?.data_mode || 'Telemetric Network'}
            </span>
            <button
              onClick={() => setActivePage('planner')}
              className="btn btn-primary btn-sm"
            >
              Open Route Planner →
            </button>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h3 className="card-title">🔮 60-Minute Horizon Forecast</h3>
            <span className="badge badge-green">ML Engine</span>
          </div>
          <PredictionForecastChart horizons={forecastData?.forecast || {}} height={220} />
          <div style={{ marginTop: 'auto', background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 600, marginBottom: '4px' }}>
              Predictive Rationale:
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              Traffic models predict evening rush-hour buildup along MG Road (Bandar Road) over the next 45 minutes. Drivers are advised to use NH-16 bypass corridors.
            </div>
          </div>
        </div>
      </div>

      {/* SEGMENTS STATUS TABLE & RECENT JOURNEYS */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🚦 Core Road Segments Live Telemetry</h3>
            <span className="badge badge-amber">{trafficData?.data_mode || 'DEMO DATA'}</span>
          </div>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Corridor</th>
                  <th>Current Speed</th>
                  <th>Congestion</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(trafficData?.segments || []).slice(0, 5).map(seg => (
                  <tr key={seg.segment_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{seg.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{seg.corridor}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>
                      {seg.current_speed} km/h
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                          {Math.round((seg.congestion_index || 0.4) * 100)}%
                        </span>
                        <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                          <div style={{
                            width: `${(seg.congestion_index || 0.4) * 100}%`,
                            height: '100%',
                            background: seg.congestion_index > 0.65 ? '#ef4444' : (seg.congestion_index > 0.35 ? '#f59e0b' : '#10b981'),
                            borderRadius: '2px'
                          }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${seg.status === 'CONGESTED' ? 'badge-red' : (seg.status === 'MODERATE' ? 'badge-amber' : 'badge-green')}`}>
                        {seg.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🕒 Recent Optimized Journeys</h3>
            <button onClick={() => setActivePage('planner')} className="btn btn-secondary btn-sm">Plan New</button>
          </div>
          {historyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '13px' }}>
              No recent journeys recorded yet. Head over to the Smart Route Planner to calculate your first AI-recommended route!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {historyData.slice(0, 4).map((item, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                      {item.origin?.name || 'Origin'} → {item.destination?.name || 'Destination'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Vehicle: {item.vehicleType?.toUpperCase() || 'SEDAN'} | {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                      Score: {item.recommendedRoute?.score || '0.24'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {item.recommendedRoute?.duration_mins || 15} mins
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
