import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import L, { type LeafletMouseEvent, type Map as LeafletMap, type PathOptions } from 'leaflet';
import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet';
import type { LsoaGeoJson, LsoaProperties } from '../types/data';

type LayerStyler = (properties: LsoaProperties) => PathOptions;

type SliderCompareMapProps = {
  data: LsoaGeoJson | null;
  leftStyle: LayerStyler;
  rightStyle: LayerStyler;
  leftLabel: string;
  rightLabel: string;
  onSelect?: (feature: LsoaProperties) => void;
  tooltipFormatter?: (properties: LsoaProperties) => string;
  caption?: string;
  initialPct?: number;
  fillContainer?: boolean;
  children?: ReactNode;
};

const londonCenter: [number, number] = [51.5074, -0.1278];
const londonZoom = 10;
const zoomStep = 0.5;

type HalfMapProps = {
  data: LsoaGeoJson;
  styler: LayerStyler;
  onSelect?: (properties: LsoaProperties) => void;
  tooltipFormatter?: (properties: LsoaProperties) => string;
  onMapReady: (map: LeafletMap) => void;
  showAttribution?: boolean;
};

const HalfMap = ({
  data,
  styler,
  onSelect,
  tooltipFormatter,
  onMapReady,
  showAttribution = false,
}: HalfMapProps) => {
  return (
    <MapContainer
      center={londonCenter}
      zoom={londonZoom}
      className="leaflet-map"
      preferCanvas={false}
      zoomControl={false}
      attributionControl={showAttribution}
      zoomSnap={0.25}
      zoomDelta={zoomStep}
      wheelPxPerZoomLevel={120}
      wheelDebounceTime={20}
      zoomAnimation
      zoomAnimationThreshold={8}
      fadeAnimation
      markerZoomAnimation
      inertia
      easeLinearity={0.2}
      ref={(instance) => {
        if (instance) onMapReady(instance);
      }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <GeoJSON
        key="half-map-geojson"
        data={data as FeatureCollection}
        style={(feature) => styler(feature?.properties as LsoaProperties)}
        onEachFeature={(feature, layer) => {
          const properties = feature.properties as LsoaProperties;
          if (tooltipFormatter) {
            layer.bindTooltip(tooltipFormatter(properties), {
              sticky: true,
              opacity: 0.9,
            });
          }
          layer.on({
            click: () => onSelect?.(properties),
            mouseover: (event: LeafletMouseEvent) => {
              event.target.setStyle({ weight: 1.6, color: '#241b19' });
            },
            mouseout: (event: LeafletMouseEvent) => {
              event.target.setStyle(styler(properties));
              event.target.closeTooltip();
            },
          });
        }}
      />
    </MapContainer>
  );
};

const SliderCompareMap = ({
  data,
  leftStyle,
  rightStyle,
  leftLabel,
  rightLabel,
  onSelect,
  tooltipFormatter,
  caption,
  initialPct = 50,
  fillContainer = false,
  children,
}: SliderCompareMapProps) => {
  const [pct, setPct] = useState(initialPct);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const leftMapRef = useRef<LeafletMap | null>(null);
  const rightMapRef = useRef<LeafletMap | null>(null);
  const syncingRef = useRef(false);
  const syncFrameRef = useRef<number | null>(null);
  const pendingSyncRef = useRef<{
    source: LeafletMap;
    target: LeafletMap;
  } | null>(null);
  const detachSyncRef = useRef<(() => void) | null>(null);
  const zoomControlRef = useRef<L.Control.Zoom | null>(null);

  const attachSync = () => {
    const leftMap = leftMapRef.current;
    const rightMap = rightMapRef.current;
    if (!leftMap || !rightMap || detachSyncRef.current) return;

    const sync = (source: LeafletMap, target: LeafletMap) => {
      if (syncingRef.current) return;
      pendingSyncRef.current = { source, target };
      if (syncFrameRef.current !== null) return;

      syncFrameRef.current = window.requestAnimationFrame(() => {
        const pending = pendingSyncRef.current;
        syncFrameRef.current = null;
        pendingSyncRef.current = null;
        if (!pending) return;

        syncingRef.current = true;
        pending.target.setView(pending.source.getCenter(), pending.source.getZoom(), {
          animate: false,
          noMoveStart: true,
        });
        syncingRef.current = false;
      });
    };

    const onLeftMove = () => sync(leftMap, rightMap);
    const onRightMove = () => sync(rightMap, leftMap);

    leftMap.on('move zoom', onLeftMove);
    rightMap.on('move zoom', onRightMove);
    detachSyncRef.current = () => {
      leftMap.off('move zoom', onLeftMove);
      rightMap.off('move zoom', onRightMove);
    };

    // Invalidate sizes in case the container sizes changed mid-mount.
    leftMap.invalidateSize();
    rightMap.invalidateSize();
  };

  useEffect(() => {
    return () => {
      detachSyncRef.current?.();
      if (syncFrameRef.current !== null) {
        window.cancelAnimationFrame(syncFrameRef.current);
      }
      zoomControlRef.current?.remove();
      leftMapRef.current = null;
      rightMapRef.current = null;
    };
  }, []);

  const onLeftReady = (map: LeafletMap) => {
    if (leftMapRef.current === map) return;
    leftMapRef.current = map;
    attachSync();
  };

  const onRightReady = (map: LeafletMap) => {
    if (rightMapRef.current === map) return;
    rightMapRef.current = map;
    // Mirror initial view to match left immediately.
    if (leftMapRef.current) {
      map.setView(
        leftMapRef.current.getCenter(),
        leftMapRef.current.getZoom(),
        { animate: false },
      );
    }
    attachSync();
    // Add a single shared zoom control to the left map only.
    if (leftMapRef.current && !zoomControlRef.current) {
      zoomControlRef.current = L.control.zoom({ position: 'topleft' }).addTo(leftMapRef.current);
    }
  };

  const startDrag = (event: React.PointerEvent) => {
    event.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const handleMove = (moveEvent: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const next = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setPct(Math.max(4, Math.min(96, next)));
    };
    const stop = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  if (!data) {
    return <div className="map-placeholder">Loading map data...</div>;
  }

  return (
    <div className="map-card">
      <div
        ref={stageRef}
        className={`map-stage slider-compare${fillContainer ? ' map-stage--fill' : ''}`}
      >
        <div className="slider-compare__half slider-compare__half--left">
          <HalfMap
            data={data}
            styler={leftStyle}
            onSelect={onSelect}
            tooltipFormatter={tooltipFormatter}
            onMapReady={onLeftReady}
            showAttribution
          />
        </div>

        <div
          className="slider-compare__half slider-compare__half--right"
          style={{
            clipPath: `inset(0 0 0 ${pct}%)`,
            WebkitClipPath: `inset(0 0 0 ${pct}%)`,
          }}
        >
          <HalfMap
            data={data}
            styler={rightStyle}
            onSelect={onSelect}
            tooltipFormatter={tooltipFormatter}
            onMapReady={onRightReady}
          />
        </div>

        {/* Labels */}
        <div className="slider-compare__label slider-compare__label--left">
          <span className="slider-compare__label-kicker">Left ←</span>
          <span className="slider-compare__label-text">{leftLabel}</span>
        </div>
        <div className="slider-compare__label slider-compare__label--right">
          <span className="slider-compare__label-kicker">→ Right</span>
          <span className="slider-compare__label-text">{rightLabel}</span>
        </div>

        {/* Divider + handle */}
        <div
          className="slider-compare__divider"
          style={{ left: `${pct}%` }}
          onPointerDown={startDrag}
          role="separator"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={4}
          aria-valuemax={96}
        >
          <div className="slider-compare__handle" aria-hidden="true">
            <span />
            <span />
          </div>
        </div>

        {caption ? <div className="map-overlay map-overlay--caption">{caption}</div> : null}
        {children}
      </div>
    </div>
  );
};

export default SliderCompareMap;
