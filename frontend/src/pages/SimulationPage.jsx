import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RoadUtilizationBarChart } from '../components/SvgCharts';

export default function SimulationPage() {
  const [vehicleCount, setVehicleCount] = useState(300);
  const [scenario, setScenario] = useState('rush_hour');
  const [simulationData, setSimulationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('comparison'); // 'comparison' | 'visualizer'
  const [animationTick, setAnimationTick] = useState(0);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await api.simulation.run(vehicleCount, scenario);
      if (res.success) {
        setSimulationData(res.data);
      }
    } catch (e) {
      console.warn('Simulation error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, []);

  // Visual simulation animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationTick(t => (t + 1) % 100);
    }, 60);
    return () => clearInterval(timer);
  }, []);

  const modeA = simulationData?.mode_a_independent;
  const modeB = simulationData?.mode_b_coordinated;
  const impact = simulationData?.impact_comparison;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* SIMULATION CONTROL DECK */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
              Coordinated Traffic Distribution & Bottleneck Mitigation Lab
            </h2>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Testing Selfish User-Equilibrium (Mode A) vs System-Optimal Multi-Path Flow (Mode B) using BPR latency functions
            </div>
          </div>
          <span className="badge badge-green">BPR Delay Modeling</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          {/* VEHICLE COUNT SLIDER */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span style={{ color: '#94a3b8' }}>Simulated Fleet Volume:</span>
              <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>{vehicleCount} vehicles</span>
            </div>
            <input
              type="range"
              min="50"
              max="800"
              step="25"
              value={vehicleCount}
              onChange={e => setVehicleCount(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#3b82f6' }}
            />
          </div>

          {/* TRAFFIC SCENARIO SELECTOR */}
          <div>
            <label className="form-label" style={{ marginBottom: '6px' }}>Operating Scenario</label>
            <select
              className="input-select"
              value={scenario}
              onChange={e => setScenario(e.target.value)}
            >
              <option value="rush_hour">Morning Commute Rush (+35% base traffic)</option>
              <option value="rainstorm">Monsoon Downpour (-25% road capacity)</option>
              <option value="incident">MG Road Lane Constriction (Breakdown)</option>
            </select>
          </div>

          {/* RUN BUTTON */}
          <div>
            <button
              onClick={runSimulation}
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Simulating BPR Network...' : '▶ Run Coordinated Simulation'}
            </button>
          </div>
        </div>
      </div>

      {/* COMPARATIVE IMPACT HEADLINE BANNER */}
      {impact && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Travel Time Reduction
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
              -{impact.travel_time_improvement_pct}%
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Saved across fleet trips</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cumulative Delay Prevented
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
              -{impact.delay_reduction_pct}%
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Total vehicle-hours saved</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fuel Conservation
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace' }}>
              {impact.fuel_saved_liters} L
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Saved in idling & stop-and-go</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Overloaded Corridors
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#a855f7', fontFamily: 'monospace' }}>
              {modeA?.overloaded_roads} → {modeB?.overloaded_roads}
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Bottlenecks eliminated</div>
          </div>
        </div>
      )}

      {/* TABS: ROAD CAPACITY COMPARISON VS ANIMATED VISUALIZER */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`btn ${activeTab === 'comparison' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          📊 Road Utilization & Capacity Metrics
        </button>
        <button
          onClick={() => setActiveTab('visualizer')}
          className={`btn ${activeTab === 'visualizer' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          🚦 Visual Road Network Flow Animation
        </button>
      </div>

      {activeTab === 'comparison' ? (
        /* COMPARISON PANELS */
        <div className="grid-2">
          {/* MODE A CARD */}
          <div className="card" style={{ borderTop: '4px solid #ef4444' }}>
            <div className="card-header">
              <div>
                <h3 className="card-title" style={{ color: '#ef4444' }}>
                  Mode A: Independent (Selfish) Routing
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Drivers independently select the individually fastest route (creates bottleneck)
                </div>
              </div>
              <span className="badge badge-red">Uncoordinated</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Average Trip Time</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                  {modeA?.avg_travel_time_mins} mins
                </span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Total Delay</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>
                  {modeA?.total_delay_hours} hrs
                </span>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '14px', lineHeight: 1.5 }}>
              Under independent routing, 65% of vehicles choose Bandar Road (MG Road) believing it to be fastest. This exceeds its capacity, causing traffic delay to quadruple.
            </div>

            <RoadUtilizationBarChart modeA={modeA?.corridor_breakdown} modeB={modeB?.corridor_breakdown} />
          </div>

          {/* MODE B CARD */}
          <div className="card" style={{ borderTop: '4px solid #10b981' }}>
            <div className="card-header">
              <div>
                <h3 className="card-title" style={{ color: '#10b981' }}>
                  Mode B: Coordinated (System-Optimal) Routing
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  SmartRoute AI dynamically balances vehicles across alternate arterials
                </div>
              </div>
              <span className="badge badge-green">Balanced Flow</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Average Trip Time</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                  {modeB?.avg_travel_time_mins} mins
                </span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Total Delay</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                  {modeB?.total_delay_hours} hrs
                </span>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '14px', lineHeight: 1.5 }}>
              SmartRoute AI diverts a proportion of vehicles onto the NH-16 bypass and Eluru Road. By keeping all corridors under 85% capacity, phantom gridlocks are prevented.
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '14px', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
                Simulation Takeaway for Judges:
              </div>
              {impact?.conclusion}
            </div>
          </div>
        </div>
      ) : (
        /* VISUAL ROAD NETWORK FLOW ANIMATION (NATIVE SVG) */
        <div className="card" style={{ padding: '24px' }}>
          <h3 className="card-title" style={{ marginBottom: '12px' }}>
            🛰️ Multi-Corridor Dynamic Traffic Flow Simulation
          </h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
            Visualizing vehicle packets traversing 4 parallel corridors between PNBS / West City and Ramavarappadu / East Gateway.
          </p>

          <svg viewBox="0 0 900 420" style={{ width: '100%', height: 'auto', background: '#0a0f1d', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            {/* Origin Hub */}
            <circle cx="100" cy="210" r="32" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
            <text x="100" y="206" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">WEST HUB</text>
            <text x="100" y="222" fill="#94a3b8" fontSize="10" textAnchor="middle">PNBS Entry</text>

            {/* Destination Hub */}
            <circle cx="800" cy="210" r="32" fill="#1e293b" stroke="#10b981" strokeWidth="2.5" />
            <text x="800" y="206" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">EAST HUB</text>
            <text x="800" y="222" fill="#94a3b8" fontSize="10" textAnchor="middle">Ramavarappadu</text>

            {/* CORRIDOR 1: BANDAR ROAD (Arterial 1) */}
            <path d="M 132 195 C 300 130, 600 130, 768 195" fill="none" stroke="#ef4444" strokeWidth="10" strokeOpacity="0.4" />
            <text x="450" y="115" fill="#fca5a5" fontSize="12" fontWeight="bold" textAnchor="middle">
              Corridor 1: Bandar Road (MG Road) — {modeA?.corridor_breakdown?.[0]?.utilization_pct}% Load (Congested)
            </text>

            {/* CORRIDOR 2: ELURU ROAD (Arterial 2) */}
            <path d="M 132 205 C 300 175, 600 175, 768 205" fill="none" stroke="#3b82f6" strokeWidth="8" strokeOpacity="0.4" />
            <text x="450" y="170" fill="#93c5fd" fontSize="11" textAnchor="middle">
              Corridor 2: Eluru Road — {modeA?.corridor_breakdown?.[1]?.utilization_pct}% Load
            </text>

            {/* CORRIDOR 3: NH-16 FLYOVER BYPASS */}
            <path d="M 132 215 C 300 245, 600 245, 768 215" fill="none" stroke="#10b981" strokeWidth="10" strokeOpacity="0.4" />
            <text x="450" y="260" fill="#6ee7b7" fontSize="11" textAnchor="middle">
              Corridor 3: NH-16 Express Bypass — {modeA?.corridor_breakdown?.[2]?.utilization_pct}% Load (Fastest Bypass)
            </text>

            {/* CORRIDOR 4: INNER RING ROAD */}
            <path d="M 132 225 C 300 300, 600 300, 768 225" fill="none" stroke="#a855f7" strokeWidth="7" strokeOpacity="0.4" />
            <text x="450" y="325" fill="#d8b4fe" fontSize="11" textAnchor="middle">
              Corridor 4: Inner Ring Road — {modeA?.corridor_breakdown?.[3]?.utilization_pct}% Load
            </text>

            {/* ANIMATED VEHICLE DOTS */}
            {[0, 15, 30, 45, 60, 75, 90].map((offset, idx) => {
              const progress = ((animationTick + offset) % 100) / 100;
              // Mode A vehicles mostly on corridor 1
              const x1 = 132 + progress * (768 - 132);
              const y1 = 195 - Math.sin(progress * Math.PI) * 65;

              // Coordinated vehicles balanced on corridor 3
              const x3 = 132 + progress * (768 - 132);
              const y3 = 215 + Math.sin(progress * Math.PI) * 30;

              return (
                <g key={idx}>
                  {/* Heavy bunching on corridor 1 */}
                  <circle cx={x1} cy={y1} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                  {/* Smooth balanced vehicles on corridor 3 */}
                  <circle cx={x3} cy={y3} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
