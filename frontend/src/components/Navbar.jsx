import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Navbar({ activePage, setActivePage, isMobileOpen, setIsMobileOpen, onOpenAuth }) {
  const { user, logout } = useAuth();
  const [trafficMode, setTrafficMode] = useState('DEMO SIMULATION DATA');
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.traffic.getStatus();
        if (res.success) {
          setTrafficMode(res.mode);
        }
      } catch (e) {}

      try {
        const wRes = await api.weather.getCurrent();
        if (wRes.success) {
          setWeather(wRes.weather);
        }
      } catch (e) {}
    };
    fetchStatus();
  }, []);

  const pageTitles = {
    landing: 'SmartRoute AI Platform Overview',
    dashboard: 'Vijayawada Traffic Intelligence Dashboard',
    planner: 'Smart Multi-Criteria Route Planner',
    analytics: 'Road Network Traffic Analytics & Congestion Horizons',
    simulation: 'Coordinated Traffic Balancing Simulation (Mode A vs Mode B)',
    profile: 'User Profile & Navigation Preferences',
    admin: 'System Health & Microservice Topology'
  };

  const isLive = trafficMode === 'LIVE DATA';

  return (
    <header className="app-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'none'
          }}
          className="mobile-menu-btn"
        >
          ☰
        </button>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
            {pageTitles[activePage] || 'SmartRoute AI'}
          </h2>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Location: Vijayawada, Andhra Pradesh, India
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Weather Indicator */}
        {weather && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 12px',
            fontSize: '12px'
          }}>
            <span>🌤️</span>
            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{weather.temp_c}°C</span>
            <span style={{ color: '#94a3b8', fontSize: '11px' }}>{weather.condition}</span>
          </div>
        )}

        {/* Data Source Mode Indicator */}
        <div className={`nav-status-badge ${isLive ? '' : 'demo'}`}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isLive ? '#10b981' : '#f59e0b'
          }}></span>
          <span>{trafficMode}</span>
        </div>

        {/* Auth CTA */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setActivePage('profile')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px' }}
            >
              👤 {user.name.split(' ')[0]}
            </button>
            <button
              onClick={logout}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px', color: '#f87171' }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="btn btn-primary btn-sm"
          >
            Sign In / Register
          </button>
        )}
      </div>
    </header>
  );
}
