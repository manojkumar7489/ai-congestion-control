import React from 'react';

/**
 * HourlyTrafficChart: Native SVG Area Chart displaying 24-Hour Congestion Pattern
 */
export function HourlyTrafficChart({ data = [], height = 220 }) {
  if (!data || data.length === 0) {
    return <div style={{ color: '#64748b', fontSize: '12px', padding: '20px', textAlign: 'center' }}>No historical pattern data available</div>;
  }

  const width = 650;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Scale calculations
  const maxCong = 1.0;
  const getX = (hour) => padding.left + (hour / 23) * chartW;
  const getY = (cong) => padding.top + chartH - (cong / maxCong) * chartH;

  // Build polygon points
  const points = data.map(d => `${getX(d.hour).toFixed(1)},${getY(d.avg_congestion).toFixed(1)}`).join(' ');
  const areaPoints = `${getX(0)},${getY(0)} ${points} ${getX(23)},${getY(0)}`;

  // Grid line values
  const yTicks = [0.25, 0.50, 0.75, 1.0];
  const xTicks = [0, 4, 8, 12, 16, 20, 23];

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map(t => (
          <g key={t}>
            <line
              x1={padding.left}
              y1={getY(t)}
              x2={width - padding.right}
              y2={getY(t)}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeDasharray="4 4"
            />
            <text x={padding.left - 8} y={getY(t) + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="sans-serif">
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {xTicks.map(hour => (
          <g key={hour}>
            <line
              x1={getX(hour)}
              y1={padding.top}
              x2={getX(hour)}
              y2={padding.top + chartH}
              stroke="rgba(255, 255, 255, 0.04)"
            />
            <text x={getX(hour)} y={height - 8} fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="sans-serif">
              {hour.toString().padStart(2, '0')}:00
            </text>
          </g>
        ))}

        {/* Shaded Area */}
        <polygon points={areaPoints} fill="url(#areaGradient)" />

        {/* Stroke Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map(d => (
          <circle
            key={d.hour}
            cx={getX(d.hour)}
            cy={getY(d.avg_congestion)}
            r={d.avg_congestion > 0.7 ? "3.5" : "2"}
            fill={d.avg_congestion > 0.7 ? "#ef4444" : "#60a5fa"}
            stroke="#0f172a"
            strokeWidth="1.5"
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * PredictionForecastChart: Native SVG multi-horizon prediction display (15m, 30m, 45m, 60m)
 */
export function PredictionForecastChart({ horizons = {}, height = 180 }) {
  const keys = Object.keys(horizons);
  if (keys.length === 0) {
    return <div style={{ color: '#64748b', fontSize: '12px', padding: '16px' }}>No horizon predictions available</div>;
  }

  const items = keys.map(k => horizons[k]);
  const width = 450;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const barW = 40;
  const step = chartW / items.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Background Guidelines */}
      {[0.25, 0.50, 0.75, 1.0].map(val => {
        const y = padding.top + chartH - val * chartH;
        return (
          <g key={val}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <text x={padding.left - 6} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end">{val * 100}%</text>
          </g>
        );
      })}

      {items.map((item, i) => {
        const cong = item.predicted_congestion_index;
        const barH = cong * chartH;
        const x = padding.left + i * step + (step - barW) / 2;
        const y = padding.top + chartH - barH;
        const color = cong > 0.65 ? '#ef4444' : (cong > 0.35 ? '#f59e0b' : '#10b981');

        return (
          <g key={item.minutes_ahead || i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="4"
              fill={color}
              opacity="0.85"
            />
            {/* Speed value badge */}
            <text x={x + barW / 2} y={y - 6} fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">
              {Math.round(cong * 100)}%
            </text>
            {/* Time label */}
            <text x={x + barW / 2} y={height - 18} fill="#94a3b8" fontSize="11" fontWeight="600" textAnchor="middle">
              +{item.minutes_ahead}m
            </text>
            <text x={x + barW / 2} y={height - 6} fill="#64748b" fontSize="9" textAnchor="middle">
              {item.predicted_speed_kmh} km/h
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * RoadUtilizationBarChart: Native SVG Comparison for Simulation Mode A vs Mode B
 */
export function RoadUtilizationBarChart({ modeA = [], modeB = [] }) {
  if (!modeA || modeA.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {modeA.map((corridor, i) => {
        const matchingB = modeB[i] || {};
        const utilA = corridor.utilization_pct || 0;
        const utilB = matchingB.utilization_pct || 0;

        return (
          <div key={corridor.corridor_id} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              <span style={{ color: '#f8fafc' }}>{corridor.corridor_name}</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Capacity: {corridor.capacity} vph</span>
            </div>

            {/* Mode A (Selfish) Bar */}
            <div style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px', color: '#ef4444' }}>
                <span>Mode A (Independent Routing): {utilA}% Load</span>
                <span>{corridor.avg_travel_time_mins} mins {utilA > 100 ? '⚠️ BOTTLENECK' : ''}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, utilA)}%`,
                  height: '100%',
                  background: utilA > 100 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : '#3b82f6',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease'
                }}></div>
              </div>
            </div>

            {/* Mode B (Coordinated) Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px', color: '#10b981' }}>
                <span>Mode B (Coordinated Routing): {utilB}% Balanced</span>
                <span>{matchingB.avg_travel_time_mins} mins ✓ OPTIMAL</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, utilB)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease'
                }}></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
