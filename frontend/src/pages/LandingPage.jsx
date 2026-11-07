import React from 'react';

export default function LandingPage({ setActivePage, onOpenAuth }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', paddingBottom: '40px' }}>
      {/* HERO SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '24px',
        padding: '48px 36px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '9999px',
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          color: '#60a5fa',
          fontSize: '12px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '20px'
        }}>
          ✨ Techthon 2026 Academic Innovation
        </div>

        <h1 style={{
          fontSize: '44px',
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          maxWidth: '820px',
          margin: '0 auto 18px',
          background: 'linear-gradient(135deg, #ffffff 40%, #93c5fd 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Intelligent Congestion Prediction & Smart Multi-Criteria Route Optimization
        </h1>

        <p style={{
          fontSize: '17px',
          color: '#94a3b8',
          maxWidth: '680px',
          margin: '0 auto 32px',
          lineHeight: 1.6
        }}>
          Moving beyond conventional shortest-path navigation. SmartRoute AI combines scikit-learn machine learning, vehicle-specific fuel dynamics, and coordinated traffic distribution to eliminate urban bottlenecking.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActivePage('planner')}
            className="btn btn-primary"
            style={{ padding: '14px 28px', fontSize: '15px' }}
          >
            🧭 Launch Route Planner
          </button>
          <button
            onClick={() => setActivePage('simulation')}
            className="btn btn-secondary"
            style={{ padding: '14px 28px', fontSize: '15px' }}
          >
            🚦 Explore Traffic Simulation
          </button>
          <button
            onClick={onOpenAuth}
            className="btn btn-success"
            style={{ padding: '14px 28px', fontSize: '15px' }}
          >
            👤 Sign In / Create Account
          </button>
        </div>
      </section>

      {/* CORE CAPABILITIES */}
      <section>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            System Architecture & Core Modules
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            Four pillars delivering a next-generation transport intelligence system
          </p>
        </div>

        <div className="grid-2">
          <div className="card">
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🧠</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              Multi-Horizon Traffic Prediction
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
              Trained RandomForestRegressor forecasting congestion index and road speeds across 15, 30, 45, and 60 minute horizons using historical diurnal curves, weekday trends, and weather factors.
            </p>
          </div>

          <div className="card">
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>⚖️</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              Multi-Factor Route Scoring
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
              Scores candidate routes using calibrated weights: 45% Normalized Travel Time + 30% Normalized Fuel Consumption + 25% Congestion Penalty. Prioritizes seamless flow over congested short cuts.
            </p>
          </div>

          <div className="card">
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>⛽</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              Vehicle Fuel & Emission Modeling
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
              Physics-based fuel estimation tailored for Motorcycles, Compact Cars, Sedans, and SUVs. Integrates idle fuel burn during congestion delays and stop-and-go acceleration penalties.
            </p>
          </div>

          <div className="card">
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🔀</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              Coordinated Traffic Distribution
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
              Overcomes Braess's Paradox and selfish equilibrium using BPR link delay equations. Distributes vehicle flows dynamically across alternate arterials to prevent bottleneck formation.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="card" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f8fafc', marginBottom: '24px', textAlign: 'center' }}>
          How SmartRoute AI Operates End-to-End
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {[
            { step: '01', title: 'Telemetry Ingestion', desc: 'Queries OpenStreetMap raster tiles, Nominatim geocoding, and road segment observations.' },
            { step: '02', title: 'ML Prediction', desc: 'FastAPI microservice computes future speeds & congestion probabilities for the corridor.' },
            { step: '03', title: 'Multi-Criteria Rank', desc: 'Calculates fuel, time, and congestion penalties to select optimal balance.' },
            { step: '04', title: 'Coordinated Flow', desc: 'Balances arterial vehicle volume to protect network capacity from cascading bottlenecks.' }
          ].map(s => (
            <div key={s.step} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#3b82f6', marginBottom: '8px', fontFamily: 'monospace' }}>
                {s.step}
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>{s.title}</h4>
              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TECHNOLOGY STACK */}
      <section>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px', textAlign: 'center' }}>
          Strictly Compliant Technology Architecture
        </h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {['React.js (Pure)', 'Node.js & Express', 'Python FastAPI', 'Scikit-Learn ML', 'MongoDB Mongoose', 'OpenStreetMap Tiles', 'Native Web Mercator SVG', 'Pure CSS3'].map(tech => (
            <div key={tech} style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#cbd5e1'
            }}>
              ✓ {tech}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
