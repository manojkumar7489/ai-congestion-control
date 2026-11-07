import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activePage, setActivePage, isMobileOpen, setIsMobileOpen }) {
  const { user } = useAuth();

  const navItems = [
    { id: 'landing', label: 'Welcome / Home', icon: '🏠' },
    { id: 'dashboard', label: 'Live Dashboard', icon: '📊' },
    { id: 'planner', label: 'Smart Route Planner', icon: '🧭', badge: 'Core' },
    { id: 'analytics', label: 'Traffic Analytics', icon: '📈' },
    { id: 'simulation', label: 'Traffic Simulation', icon: '🚦', badge: 'AI' },
    { id: 'profile', label: 'Profile & Settings', icon: '👤' },
    { id: 'admin', label: 'Admin & Systems', icon: '⚙️' }
  ];

  return (
    <aside className={`app-sidebar ${isMobileOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-badge">SR</div>
        <div>
          <div className="logo-title">SmartRoute AI</div>
          <div className="logo-subtitle">Techthon Edition 2026</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActivePage(item.id);
                if (setIsMobileOpen) setIsMobileOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: item.badge === 'Core' ? '#2563eb' : '#10b981',
                  color: '#fff',
                  fontWeight: 700
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-status-pill">
          <div className="status-dot"></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'Guest Explorer'}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {user ? (user.role === 'admin' ? 'System Administrator' : 'Verified User') : 'Demo Session'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
