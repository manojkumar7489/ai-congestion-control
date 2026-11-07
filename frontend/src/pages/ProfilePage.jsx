import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function ProfilePage({ onOpenAuth }) {
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [savedLocations, setSavedLocations] = useState([]);
  const [journeyHistory, setJourneyHistory] = useState([]);
  const [weights, setWeights] = useState({ time: 0.45, fuel: 0.30, congestion: 0.25 });
  const [selectedVehicle, setSelectedVehicle] = useState('sedan');
  const [newLocLabel, setNewLocLabel] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const loadProfileData = async () => {
    try {
      const [pRes, locRes, journeysRes, histRes] = await Promise.all([
        api.users.getProfile(),
        api.users.getSavedLocations(),
        api.routes.getJourneys().catch(() => ({ success: false })),
        api.routes.getHistory().catch(() => ({ success: false }))
      ]);

      if (pRes.success && pRes.profile) {
        setProfile(pRes.profile);
        if (pRes.profile.routingWeights) setWeights(pRes.profile.routingWeights);
        if (pRes.profile.preferredVehicle) setSelectedVehicle(pRes.profile.preferredVehicle);
      }
      if (locRes.success) setSavedLocations(locRes.locations || []);
      if (journeysRes.success && journeysRes.journeys && journeysRes.journeys.length > 0) {
        setJourneyHistory(journeysRes.journeys);
      } else if (histRes.success) {
        setJourneyHistory(histRes.history || []);
      }
    } catch (e) {
      console.warn('Profile load error:', e.message);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const handleUpdatePreferences = async (e) => {
    e.preventDefault();
    try {
      await api.users.updateProfile({
        preferredVehicle: selectedVehicle,
        routingWeights: weights
      });
      setStatusMsg('Preferences saved successfully!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      setStatusMsg('Failed to update preferences: ' + err.message);
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocLabel || !newLocAddress) return;

    try {
      const searchRes = await api.geocoding.search(newLocAddress);
      const topMatch = searchRes.results?.[0] || { lat: 16.5062, lng: 80.6480 };

      const res = await api.users.addSavedLocation({
        label: newLocLabel,
        address: newLocAddress,
        lat: topMatch.lat,
        lng: topMatch.lng,
        icon: 'pin'
      });

      if (res.success) {
        setSavedLocations([...savedLocations, res.location]);
        setNewLocLabel('');
        setNewLocAddress('');
        setStatusMsg('Location saved successfully!');
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (err) {
      setStatusMsg('Failed to add location: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* USER CARD OR GUEST NOTICE */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: '#ffffff',
              fontWeight: 'bold'
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'G'}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
                {user?.name || 'Guest / Demo Profile'}
              </h2>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                {user?.email || 'demo@smartroute.ai'} | Role: <span style={{ textTransform: 'uppercase', color: '#38bdf8' }}>{user?.role || 'Guest'}</span>
              </div>
            </div>
          </div>

          <div>
            {user ? (
              <button onClick={logout} className="btn btn-secondary">
                🚪 Log Out
              </button>
            ) : (
              <button onClick={onOpenAuth} className="btn btn-primary">
                🔑 Sign In to Save Profile
              </button>
            )}
          </div>
        </div>

        {statusMsg && (
          <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', fontSize: '13px' }}>
            {statusMsg}
          </div>
        )}
      </div>

      <div className="grid-2">
        {/* ROUTING PREFERENCES & WEIGHTS CONFIG */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚖️ Custom Optimization Weightings</h3>
            <span className="badge badge-blue">Configurable AI</span>
          </div>

          <form onSubmit={handleUpdatePreferences}>
            <div className="form-group">
              <label className="form-label">Preferred Vehicle Profile</label>
              <select
                className="input-select"
                value={selectedVehicle}
                onChange={e => setSelectedVehicle(e.target.value)}
              >
                <option value="motorcycle">Motorcycle (~42 km/L)</option>
                <option value="compact">Compact Car (~18.5 km/L)</option>
                <option value="sedan">Sedan (~14.0 km/L)</option>
                <option value="suv">SUV (~10.2 km/L)</option>
              </select>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Travel Time Weight (w_time):</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>{weights.time}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={weights.time}
                onChange={e => setWeights({ ...weights, time: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#3b82f6' }}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Fuel Conservation Weight (w_fuel):</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>{weights.fuel}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={weights.fuel}
                onChange={e => setWeights({ ...weights, fuel: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Congestion Penalty Weight (w_congestion):</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ef4444' }}>{weights.congestion}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={weights.congestion}
                onChange={e => setWeights({ ...weights, congestion: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#ef4444' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              💾 Save Personal Navigation Weights
            </button>
          </form>
        </div>

        {/* SAVED LOCATIONS */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📍 Frequent & Saved Locations</h3>
            <span className="badge badge-green">{savedLocations.length} Saved</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {savedLocations.map((loc, idx) => (
              <div key={loc.id || idx} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                    {loc.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {loc.address}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                  {loc.lat?.toFixed(3)}, {loc.lng?.toFixed(3)}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddLocation} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '10px' }}>
              Add New Saved Location
            </h4>
            <div className="form-group">
              <input
                type="text"
                className="input-text"
                placeholder="Label (e.g. College Campus, Home, Gym)"
                value={newLocLabel}
                onChange={e => setNewLocLabel(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                className="input-text"
                placeholder="Address or Landmark in Vijayawada"
                value={newLocAddress}
                onChange={e => setNewLocAddress(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
              + Save Location
            </button>
          </form>
        </div>
      </div>

      {/* RECENT JOURNEY LOGS */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📜 Journey History & Fuel Savings Record</h3>
        </div>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Route Endpoints</th>
                <th>Vehicle</th>
                <th>Distance</th>
                <th>Duration</th>
                <th>Fuel (L)</th>
                <th>Fuel Saved</th>
                <th>Date / Time</th>
              </tr>
            </thead>
            <tbody>
              {journeyHistory.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                    No journey records logged yet. Calculate routes and complete rides from the Smart Route Planner!
                  </td>
                </tr>
              ) : (
                journeyHistory.map((j, i) => {
                  const originLabel = j.originName || j.origin?.name || 'Origin';
                  const destLabel = j.destinationName || j.destination?.name || 'Destination';
                  const dist = j.actualDistanceKm !== undefined ? `${j.actualDistanceKm} km` : `${j.recommendedRoute?.distance_km || 6.2} km`;
                  const dur = j.durationMins !== undefined ? `${j.durationMins} min` : `${j.recommendedRoute?.duration_mins || 15} min`;
                  const fuel = j.fuelLiters !== undefined ? `${j.fuelLiters} L` : `${j.recommendedRoute?.fuel_liters || 0.65} L`;
                  const saved = j.fuelSavedLiters > 0 ? `${j.fuelSavedLiters} L` : (j.timeSavedMins > 0 ? `${j.timeSavedMins}m saved` : 'Optimal');
                  const dateStr = j.completedAt || j.timestamp || new Date().toISOString();

                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{originLabel} → {destLabel}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{j.chosenRouteName || 'Smart Corridor'}</div>
                      </td>
                      <td><span className="badge badge-blue">{j.vehicleType?.toUpperCase() || 'SEDAN'}</span></td>
                      <td style={{ fontFamily: 'monospace' }}>{dist}</td>
                      <td style={{ fontFamily: 'monospace' }}>{dur}</td>
                      <td style={{ fontFamily: 'monospace', color: '#10b981' }}>{fuel}</td>
                      <td style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>{saved}</td>
                      <td style={{ fontSize: '11px', color: '#64748b' }}>{new Date(dateStr).toLocaleString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
