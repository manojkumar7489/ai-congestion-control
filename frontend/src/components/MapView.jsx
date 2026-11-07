import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  projectLatLngToWorldPixels,
  unprojectWorldPixelsToLatLng,
  latLngToScreenPixel,
  buildSvgPathFromCoords,
  calculateFitBounds
} from '../utils/geoProjection';

const TILE_SIZE = 256;

// Memoized individual Tile Image component to avoid unnecessary re-renders
const MapTile = React.memo(function MapTile({ url, left, top }) {
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      crossOrigin="anonymous"
      style={{
        position: 'absolute',
        left: `${Math.round(left)}px`,
        top: `${Math.round(top)}px`,
        width: `${TILE_SIZE}px`,
        height: `${TILE_SIZE}px`,
        filter: 'brightness(0.78) invert(0.92) contrast(1.18) hue-rotate(185deg) saturate(1.4)',
        pointerEvents: 'none'
      }}
    />
  );
});

export default function MapView({
  routes = [],
  selectedRouteId = null,
  onSelectRoute = () => {},
  origin = null,
  destination = null,
  userLocation = null, // Live GPS location { lat, lng, heading, speed }
  isNavigating = false,
  incidents = [],
  roadSegments = [],
  showTrafficHeatmap = false,
  onLocateUser = null,
  className = '',
  height = '500px'
}) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Map viewport state
  const [center, setCenter] = useState({ lat: 16.5062, lng: 80.6480 }); // Default Vijayawada
  const [zoom, setZoom] = useState(13);

  // Interaction & Drag state
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragCenterStartRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const rafPanId = useRef(null);

  // Follow User Mode during GPS navigation
  const [followUser, setFollowUser] = useState(true);

  // Tooltip state
  const [hoveredRoute, setHoveredRoute] = useState(null);
  const [hoveredIncident, setHoveredIncident] = useState(null);

  // Track initial fit bounds so we don't recalculate on every minor state update
  const hasFittedRef = useRef(false);
  const lastRouteCountRef = useRef(0);

  // 1. Measure Container Dimensions
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 2. Auto-Fit Bounds when routes change (ONLY when routes array changes, NOT on GPS updates)
  useEffect(() => {
    if (routes && routes.length > 0 && routes.length !== lastRouteCountRef.current) {
      lastRouteCountRef.current = routes.length;
      const allCoords = [];
      routes.forEach(r => {
        if (r.geometry && Array.isArray(r.geometry)) {
          allCoords.push(...r.geometry);
        }
      });
      if (allCoords.length > 1 && dimensions.width > 0) {
        const { center: fitCenter, zoom: fitZoom } = calculateFitBounds(
          allCoords,
          dimensions.width,
          dimensions.height,
          70
        );
        setCenter(fitCenter);
        setZoom(fitZoom);
        hasFittedRef.current = true;
      }
    }
  }, [routes, dimensions.width, dimensions.height]);

  // 3. Smooth Auto-Center on User (when userLocation updates or on first fix)
  const prevUserLocationRef = useRef(null);
  useEffect(() => {
    if (userLocation && userLocation.lat) {
      const isFirst = !prevUserLocationRef.current;
      prevUserLocationRef.current = userLocation;
      if (followUser || isFirst) {
        setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      }
    }
  }, [userLocation?.lat, userLocation?.lng, followUser]);

  // 4. Smooth Panning Engine throttled with requestAnimationFrame
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // Only left click
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    const centerWorld = projectLatLngToWorldPixels(center.lat, center.lng, zoomRef.current);
    dragCenterStartRef.current = centerWorld;

    // If user manually pans while navigating, temporarily disable follow mode
    if (isNavigating) {
      setFollowUser(false);
    }
  }, [center.lat, center.lng, isNavigating]);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (rafPanId.current) cancelAnimationFrame(rafPanId.current);
    rafPanId.current = requestAnimationFrame(() => {
      const newWorldX = dragCenterStartRef.current.x - dx;
      const newWorldY = dragCenterStartRef.current.y - dy;
      const newLatLng = unprojectWorldPixelsToLatLng(newWorldX, newWorldY, zoomRef.current);
      setCenter(newLatLng);
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      if (rafPanId.current) cancelAnimationFrame(rafPanId.current);
    }
  }, []);

  // Global window listeners for mouse up / move to prevent mouse-leave stutter
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafPanId.current) cancelAnimationFrame(rafPanId.current);
    };
  }, [handleMouseMove, handleMouseUp]);

  // 5. Wheel Zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom(z => Math.min(17, z + 1));
    } else if (e.deltaY > 0) {
      setZoom(z => Math.max(10, z - 1));
    }
  }, []);

  const zoomIn = () => setZoom(z => Math.min(17, z + 1));
  const zoomOut = () => setZoom(z => Math.max(10, z - 1));
  const resetToCenter = () => {
    if (userLocation && userLocation.lat) {
      setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      setFollowUser(true);
      setZoom(z => Math.max(z, 14));
    } else if (onLocateUser) {
      onLocateUser();
      setFollowUser(true);
    } else if (origin && origin.lat) {
      setCenter({ lat: origin.lat, lng: origin.lng });
      setZoom(14);
    } else {
      setCenter({ lat: 16.5062, lng: 80.6480 });
      setZoom(13);
    }
  };

  // 6. Calculate visible tile grid
  const visibleTiles = useMemo(() => {
    const { width, height } = dimensions;
    const centerWorld = projectLatLngToWorldPixels(center.lat, center.lng, zoom);

    const minX = centerWorld.x - width / 2;
    const maxX = centerWorld.x + width / 2;
    const minY = centerWorld.y - height / 2;
    const maxY = centerWorld.y + height / 2;

    const startCol = Math.floor(minX / TILE_SIZE);
    const endCol = Math.floor(maxX / TILE_SIZE);
    const startRow = Math.floor(minY / TILE_SIZE);
    const endRow = Math.floor(maxY / TILE_SIZE);

    const tiles = [];
    const maxIndex = Math.pow(2, zoom) - 1;

    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const normalizedCol = ((col % (maxIndex + 1)) + (maxIndex + 1)) % (maxIndex + 1);
        if (row >= 0 && row <= maxIndex) {
          const screenX = width / 2 + (col * TILE_SIZE - centerWorld.x);
          const screenY = height / 2 + (row * TILE_SIZE - centerWorld.y);

          tiles.push({
            key: `${zoom}-${col}-${row}`,
            url: `https://tile.openstreetmap.org/${zoom}/${normalizedCol}/${row}.png`,
            left: screenX,
            top: screenY
          });
        }
      }
    }
    return tiles;
  }, [center.lat, center.lng, zoom, dimensions.width, dimensions.height]);

  // 7. Memoized SVG Route Paths with Traffic Congestion Color-Coding
  const memoizedRoutes = useMemo(() => {
    return routes.map((r, idx) => {
      const isSelected = selectedRouteId === r.id;
      const isRec = r.is_recommended || idx === 0;

      // Color-code routes strictly by their traffic congestion level
      const cong = r.congestion_index !== undefined ? r.congestion_index : (idx === 0 ? 0.18 : (idx === 1 ? 0.46 : 0.74));
      let strokeColor = '#10b981'; // Green: Low traffic / smooth flow
      let glowFilter = 'url(#glow-emerald)';
      let haloColor = 'rgba(16, 185, 129, 0.45)';

      if (cong >= 0.65 || r.congestion_level === 'HEAVY') {
        strokeColor = '#ef4444'; // Red: Heavy traffic / bottleneck
        glowFilter = 'url(#glow-red)';
        haloColor = 'rgba(239, 68, 68, 0.45)';
      } else if (cong >= 0.35 || r.congestion_level === 'MODERATE') {
        strokeColor = '#f59e0b'; // Amber: Moderate congestion
        glowFilter = 'url(#glow-amber)';
        haloColor = 'rgba(245, 158, 11, 0.45)';
      }

      let strokeWidth = isSelected ? 8 : (isRec ? 6 : 4.5);
      let strokeOpacity = isSelected ? 1.0 : (isRec ? 0.9 : 0.65);

      const pathD = buildSvgPathFromCoords(
        r.geometry,
        center.lat,
        center.lng,
        zoom,
        dimensions.width,
        dimensions.height
      );

      // Calculate midpoint coordinates for floating traffic badge on map
      let midPoint = null;
      if (r.geometry && r.geometry.length > 0) {
        const midIdx = Math.floor(r.geometry.length * (0.35 + idx * 0.15));
        const pt = r.geometry[Math.min(r.geometry.length - 1, midIdx)];
        if (pt) {
          midPoint = latLngToScreenPixel(pt[0], pt[1], center.lat, center.lng, zoom, dimensions.width, dimensions.height);
        }
      }

      return {
        ...r,
        pathD,
        isSelected,
        isRec,
        strokeColor,
        glowFilter,
        haloColor,
        strokeWidth,
        strokeOpacity,
        midPoint,
        congPercent: Math.round(cong * 100)
      };
    });
  }, [routes, center.lat, center.lng, zoom, dimensions.width, dimensions.height, selectedRouteId]);

  // 8. Screen Coordinates for Endpoints & User Marker
  const originScreen = useMemo(() => {
    return origin && origin.lat
      ? latLngToScreenPixel(origin.lat, origin.lng, center.lat, center.lng, zoom, dimensions.width, dimensions.height)
      : null;
  }, [origin?.lat, origin?.lng, center.lat, center.lng, zoom, dimensions.width, dimensions.height]);

  const destScreen = useMemo(() => {
    return destination && destination.lat
      ? latLngToScreenPixel(destination.lat, destination.lng, center.lat, center.lng, zoom, dimensions.width, dimensions.height)
      : null;
  }, [destination?.lat, destination?.lng, center.lat, center.lng, zoom, dimensions.width, dimensions.height]);

  const userScreen = useMemo(() => {
    return userLocation && userLocation.lat
      ? latLngToScreenPixel(userLocation.lat, userLocation.lng, center.lat, center.lng, zoom, dimensions.width, dimensions.height)
      : null;
  }, [userLocation?.lat, userLocation?.lng, center.lat, center.lng, zoom, dimensions.width, dimensions.height]);

  return (
    <div
      ref={containerRef}
      className={`osm-map-viewport ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: height,
        overflow: 'hidden',
        backgroundColor: '#0a0f1d',
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        borderRadius: '12px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
      }}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
    >
      {/* 1. RASTER MAP TILE LAYER */}
      <div className="osm-tile-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {visibleTiles.map(tile => (
          <MapTile
            key={tile.key}
            url={tile.url}
            left={tile.left}
            top={tile.top}
          />
        ))}
      </div>

      {/* 2. SVG VECTOR OVERLAYS (Roads, Routes, Congestion Segments) */}
      <svg
        className="osm-vector-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible'
        }}
      >
        <defs>
          <filter id="glow-emerald" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-amber" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Base Road Network Segments (if enabled) */}
        {showTrafficHeatmap && roadSegments.map(seg => {
          const pathD = buildSvgPathFromCoords(seg.coordinates, center.lat, center.lng, zoom, dimensions.width, dimensions.height);
          const color = seg.congestion_index > 0.65 ? '#ef4444' : (seg.congestion_index > 0.35 ? '#f59e0b' : '#10b981');
          return (
            <path
              key={seg.segment_id}
              d={pathD}
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.65"
              fill="none"
            />
          );
        })}

        {/* Candidate Routes Colored by Live Congestion */}
        {memoizedRoutes.map((r, idx) => {
          return (
            <g key={r.id || idx}>
              {/* Outer halo indicating selection or optimal path */}
              {(r.isSelected || r.isRec) && (
                <path
                  d={r.pathD}
                  stroke={r.haloColor || 'rgba(16, 185, 129, 0.4)'}
                  strokeWidth={r.strokeWidth + 6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.4"
                  fill="none"
                />
              )}
              {/* Main polyline with traffic-based color and glow */}
              <path
                d={r.pathD}
                stroke={r.strokeColor}
                strokeWidth={r.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={r.strokeOpacity}
                filter={r.glowFilter}
                fill="none"
                style={{
                  pointerEvents: 'stroke',
                  cursor: 'pointer',
                  transition: 'stroke-width 0.2s, stroke-opacity 0.2s'
                }}
                onMouseEnter={() => setHoveredRoute(r.id)}
                onMouseLeave={() => setHoveredRoute(null)}
                onClick={() => onSelectRoute(r.id)}
              />
            </g>
          );
        })}
      </svg>

      {/* 2.5 FLOATING TRAFFIC CONGESTION BADGES ON MAP */}
      {memoizedRoutes.map((r, idx) => {
        if (!r.midPoint || r.midPoint.x < 15 || r.midPoint.x > dimensions.width - 15 || r.midPoint.y < 15 || r.midPoint.y > dimensions.height - 15) {
          return null;
        }
        return (
          <div
            key={`route-traffic-pill-${r.id || idx}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectRoute(r.id);
            }}
            title={`Select ${r.name} (${r.congPercent}% congestion)`}
            style={{
              position: 'absolute',
              left: `${r.midPoint.x}px`,
              top: `${r.midPoint.y}px`,
              transform: 'translate(-50%, -50%)',
              background: r.isSelected ? '#0f172a' : 'rgba(15, 23, 42, 0.92)',
              border: `2px solid ${r.strokeColor}`,
              borderRadius: '20px',
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#f8fafc',
              cursor: 'pointer',
              zIndex: r.isSelected ? 16 : 13,
              boxShadow: r.isSelected ? `0 0 14px ${r.strokeColor}aa` : '0 2px 8px rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              pointerEvents: 'auto',
              backdropFilter: 'blur(6px)',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: r.strokeColor,
              boxShadow: `0 0 6px ${r.strokeColor}`
            }} />
            <span>{r.name?.split(' ')[0] || `Route ${idx + 1}`}: <strong style={{ color: r.strokeColor }}>{r.congPercent}%</strong> ({r.duration_mins}m)</span>
          </div>
        );
      })}

      {/* 3. MARKERS LAYER */}
      {/* Origin Marker */}
      {originScreen && (
        <div
          style={{
            position: 'absolute',
            left: `${originScreen.x}px`,
            top: `${originScreen.y}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <div style={{
            background: '#10b981',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.6)',
            marginBottom: '4px',
            whiteSpace: 'nowrap'
          }}>
            START
          </div>
          <svg width="26" height="32" viewBox="0 0 24 30" fill="none">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 18 12 18s12-9 12-18c0-6.63-5.37-12-12-12z" fill="#10b981" />
            <circle cx="12" cy="11" r="5" fill="#ffffff" />
            <circle cx="12" cy="11" r="2.5" fill="#047857" />
          </svg>
        </div>
      )}

      {/* Destination Marker */}
      {destScreen && (
        <div
          style={{
            position: 'absolute',
            left: `${destScreen.x}px`,
            top: `${destScreen.y}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <div style={{
            background: '#ef4444',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.6)',
            marginBottom: '4px',
            whiteSpace: 'nowrap'
          }}>
            DESTINATION
          </div>
          <svg width="26" height="32" viewBox="0 0 24 30" fill="none">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 18 12 18s12-9 12-18c0-6.63-5.37-12-12-12z" fill="#ef4444" />
            <circle cx="12" cy="11" r="5" fill="#ffffff" />
            <circle cx="12" cy="11" r="2.5" fill="#991b1b" />
          </svg>
        </div>
      )}

      {/* LIVE USER GPS VEHICLE MARKER (With Smooth Coordinate Transition & Compass Heading) */}
      {userScreen && (
        <div
          style={{
            position: 'absolute',
            left: `${userScreen.x}px`,
            top: `${userScreen.y}px`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 18,
            transition: 'left 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
        >
          {/* Radar accuracy pulse ring */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '46px',
            height: '46px',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.25)',
            border: '1px solid rgba(59, 130, 246, 0.6)',
            animation: 'pulse 2s infinite ease-out'
          }} />

          {/* Vehicle Navigation Arrow / Dot */}
          <div style={{
            position: 'relative',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#2563eb',
            border: '2.5px solid #ffffff',
            boxShadow: '0 0 14px rgba(37, 99, 235, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: userLocation.heading !== undefined ? `rotate(${userLocation.heading}deg)` : 'none',
            transition: 'transform 0.3s ease'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M12 2L2 22l10-4 10 4L12 2z" />
            </svg>
          </div>
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '3px',
            background: 'rgba(15, 23, 42, 0.9)',
            color: '#60a5fa',
            fontSize: '10px',
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: '4px',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
          }}>
            YOU
          </div>
        </div>
      )}

      {/* Incident Markers */}
      {incidents.map(inc => {
        const screen = latLngToScreenPixel(inc.lat, inc.lng, center.lat, center.lng, zoom, dimensions.width, dimensions.height);
        return (
          <div
            key={inc.incident_id}
            style={{
              position: 'absolute',
              left: `${screen.x}px`,
              top: `${screen.y}px`,
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              zIndex: 9
            }}
            onMouseEnter={() => setHoveredIncident(inc)}
            onMouseLeave={() => setHoveredIncident(null)}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              border: '2px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.8)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#000' }}>!</span>
            </div>
          </div>
        );
      })}

      {/* Incident Tooltip */}
      {hoveredIncident && (
        <div style={{
          position: 'absolute',
          bottom: '50px',
          left: '20px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#f8fafc',
          fontSize: '12px',
          maxWidth: '320px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 20
        }}>
          <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>
            ⚠️ {hoveredIncident.title}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '11px', marginBottom: '4px' }}>
            {hoveredIncident.impact}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '10px' }}>
            Road: {hoveredIncident.road_name} | Severity: {hoveredIncident.severity?.toUpperCase()}
          </div>
        </div>
      )}

      {/* 4. INTERACTIVE CONTROLS */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 15
      }}>
        <button
          onClick={zoomIn}
          title="Zoom In"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)'
          }}
        >
          +
        </button>
        <button
          onClick={zoomOut}
          title="Zoom Out"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)'
          }}
        >
          -
        </button>
        <button
          onClick={resetToCenter}
          title={userLocation ? 'Center on My GPS Location' : 'Detect My Location / Reset'}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: userLocation && followUser ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.15)',
            background: userLocation && followUser ? 'rgba(16, 185, 129, 0.25)' : 'rgba(15, 23, 42, 0.85)',
            color: userLocation && followUser ? '#10b981' : '#3b82f6',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease'
          }}
        >
          {userLocation ? '🎯' : '📍'}
        </button>
      </div>

      {/* MAP LEGEND */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '11px',
        color: '#94a3b8',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        zIndex: 15
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '4px', backgroundColor: '#10b981', borderRadius: '2px', boxShadow: '0 0 6px #10b981' }}></span>
          <span style={{ color: '#f8fafc', fontWeight: 600 }}>Low Congestion (&lt;35%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '4px', backgroundColor: '#f59e0b', borderRadius: '2px', boxShadow: '0 0 6px #f59e0b' }}></span>
          <span style={{ color: '#f8fafc' }}>Moderate Delay (35-65%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '4px', backgroundColor: '#ef4444', borderRadius: '2px', boxShadow: '0 0 6px #ef4444' }}></span>
          <span style={{ color: '#f8fafc' }}>Heavy Bottleneck (&gt;65%)</span>
        </div>
        {userLocation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px', marginTop: '2px' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#2563eb', borderRadius: '50%', border: '1.5px solid #fff' }}></span>
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>Your Vehicle (GPS)</span>
          </div>
        )}
      </div>

      {/* ATTRIBUTION FOOTER (OSM Compliance) */}
      <div style={{
        position: 'absolute',
        bottom: '6px',
        right: '10px',
        fontSize: '10px',
        color: 'rgba(255, 255, 255, 0.45)',
        background: 'rgba(10, 15, 29, 0.75)',
        padding: '2px 6px',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: 12
      }}>
        © <a href="https://api.tomtom.com/maps/orbis/display/raster/tile/10/525/336?apiVersion=2&tileSize=512&style=street-dark&key=BzB9lswwKVfOjpdHbtPkmDhmfoGjweSx" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>OpenStreetMap</a> contributors | Web Mercator Engine
      </div>
    </div>
  );
}
