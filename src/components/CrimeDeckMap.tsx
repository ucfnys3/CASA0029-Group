import { useCallback, useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { HexagonLayer, type HexagonLayerPickingInfo } from '@deck.gl/aggregation-layers';
import {
  AmbientLight,
  DirectionalLight,
  LightingEffect,
  type MapViewState,
} from '@deck.gl/core';
import { Map as MapLibreMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export type CrimeDeckIncident = {
  lng: number;
  lat: number;
  category?: string;
  borough?: string;
};

type SelectOption = {
  value: string;
  label: string;
};

export interface CrimeDeckMapProps {
  incidents: CrimeDeckIncident[];
  selectedCrimeType: string;
  height?: string;
  crimeTypeOptions?: string[];
  onCrimeTypeChange?: (value: string) => void;
  monthOptions?: SelectOption[];
  selectedMonth?: string;
  selectedMonthLabel?: string;
  onMonthChange?: (value: string) => void;
}

const MAX_POINTS = 80_000;

const INITIAL_VIEW: MapViewState = {
  longitude: -0.118,
  latitude: 51.509,
  zoom: 10,
  pitch: 45,
  bearing: -10,
};

const VIEW_PRESETS: Array<{ label: string; viewState: MapViewState }> = [
  {
    label: 'Overview',
    viewState: INITIAL_VIEW,
  },
  {
    label: 'Top Down',
    viewState: {
      longitude: -0.118,
      latitude: 51.509,
      zoom: 11,
      pitch: 0,
      bearing: 0,
    },
  },
  {
    label: 'East London',
    viewState: {
      longitude: -0.02,
      latitude: 51.515,
      zoom: 12.5,
      pitch: 50,
      bearing: -18,
    },
  },
];

const colorRange = [
  [255, 240, 230, 180],
  [248, 199, 168, 200],
  [239, 143, 97, 220],
  [202, 85, 53, 230],
  [160, 40, 20, 240],
  [124, 29, 19, 255],
] as [number, number, number, number][];

const ambientLight = new AmbientLight({
  color: [255, 246, 232],
  intensity: 1.1,
});

const directionalLight = new DirectionalLight({
  color: [255, 224, 180],
  intensity: 1.8,
  direction: [-1, -3, -2],
});

const lightingEffect = new LightingEffect({ ambientLight, directionalLight });

const formatInteger = (value: number) => Math.round(value).toLocaleString();

const mostFrequent = (values: Array<string | undefined>) => {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    if (!value) return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Mixed';
};

const CrimeDeckMap = ({
  incidents,
  selectedCrimeType,
  height = '100vh',
  crimeTypeOptions = [],
  onCrimeTypeChange,
  monthOptions = [],
  selectedMonth,
  selectedMonthLabel,
  onMonthChange,
}: CrimeDeckMapProps) => {
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW);
  const [elevationScale, setElevationScale] = useState(8);
  const [layerElevationScale, setLayerElevationScale] = useState(8);
  const [maxHexCount, setMaxHexCount] = useState(0);

  const filteredIncidents = useMemo(() => {
    if (selectedCrimeType === 'All') {
      return incidents;
    }

    return incidents.filter((incident) => incident.category === selectedCrimeType);
  }, [incidents, selectedCrimeType]);

  const sampledIncidents = useMemo(() => {
    if (filteredIncidents.length <= MAX_POINTS) {
      return filteredIncidents;
    }

    const probability = MAX_POINTS / filteredIncidents.length;
    const sampled = filteredIncidents.filter(() => Math.random() < probability);
    return sampled.slice(0, MAX_POINTS);
  }, [filteredIncidents]);

  useEffect(() => {
    setMaxHexCount(0);
    setLayerElevationScale(0.1);
    const timeoutId = window.setTimeout(() => setLayerElevationScale(elevationScale), 40);
    return () => window.clearTimeout(timeoutId);
  }, [sampledIncidents]);

  useEffect(() => {
    setLayerElevationScale(elevationScale);
  }, [elevationScale]);

  const topBorough = useMemo(() => {
    const counts = new Map<string, number>();
    filteredIncidents.forEach((i) => {
      if (!i.borough) return;
      counts.set(i.borough, (counts.get(i.borough) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  }, [filteredIncidents]);

  const handleElevationDomain = useCallback((domain: [number, number]) => {
    const nextMax = Math.round(domain[1] ?? 0);
    setMaxHexCount((current) => (current === nextMax ? current : nextMax));
  }, []);

  const layers = useMemo(
    () => [
      new HexagonLayer<CrimeDeckIncident>({
        id: 'crime-hexagon',
        data: sampledIncidents,
        getPosition: (incident) => [incident.lng, incident.lat],
        radius: 350,
        elevationScale: layerElevationScale,
        extruded: true,
        pickable: true,
        opacity: 0.85,
        coverage: 0.88,
        colorRange,
        elevationRange: [0, 300],
        // Cap at 95th percentile so central tourist zones (Westminster, City)
        // do not visually overwhelm the deprived residential hotspots we want
        // readers to notice — this is the key fix for the dominance problem.
        upperPercentile: 95,
        elevationUpperPercentile: 90,
        colorScaleType: 'quantile',
        material: {
          ambient: 0.64,
          diffuse: 0.6,
          shininess: 32,
          specularColor: [60, 64, 70],
        },
        colorAggregation: 'SUM',
        elevationAggregation: 'SUM',
        getColorWeight: () => 1,
        getElevationWeight: () => 1,
        gpuAggregation: false,
        onSetElevationDomain: handleElevationDomain,
        transitions: {
          elevationScale: 600,
        },
      }),
    ],
    [handleElevationDomain, layerElevationScale, sampledIncidents],
  );

  const getTooltip = useCallback((info: HexagonLayerPickingInfo<CrimeDeckIncident>) => {
    const points = info.object?.points ?? [];
    if (!info.object || !points.length) {
      return null;
    }

    const borough = mostFrequent(points.map((point) => point.borough));
    const category = mostFrequent(points.map((point) => point.category));

    return {
      html: `
        <div class="crime-deck-tooltip">
          <strong>${formatInteger(info.object.count)} incidents</strong>
          <span>${borough}</span>
          <span>Main type: ${category}</span>
        </div>
      `,
      style: {
        background: 'rgba(10, 12, 18, 0.94)',
        color: '#fff6e8',
        borderRadius: '6px',
        padding: '0',
      },
    };
  }, []);

  const applyPreset = (preset: MapViewState) => {
    setViewState({
      ...preset,
      transitionDuration: 800,
    });
  };

  return (
    <div className="crime-deck-map" style={{ height }}>
      <DeckGL
        viewState={viewState}
        controller
        layers={layers}
        effects={[lightingEffect]}
        getTooltip={getTooltip}
        onViewStateChange={({ viewState: nextViewState }) =>
          setViewState(nextViewState as MapViewState)
        }
        style={{ position: 'absolute', inset: '0' }}
      >
        <MapLibreMap
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          reuseMaps
        />
      </DeckGL>

      <section className="crime-deck-map__controls" aria-label="Crime hotspot controls">
        <h2>Crime Hotspots Q4 2025</h2>

        {monthOptions.length && selectedMonth && onMonthChange ? (
          <label className="crime-deck-map__field">
            <span>Month</span>
            <select value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)}>
              {monthOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {crimeTypeOptions.length && onCrimeTypeChange ? (
          <label className="crime-deck-map__field">
            <span>Crime type</span>
            <select
              value={selectedCrimeType}
              onChange={(event) => onCrimeTypeChange(event.target.value)}
            >
              <option value="All">All Types</option>
              {crimeTypeOptions.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="crime-deck-map__field">
          <span>Height scale</span>
          <input
            type="range"
            min="4"
            max="20"
            step="1"
            value={elevationScale}
            onChange={(event) => setElevationScale(Number(event.target.value))}
          />
          <strong>{elevationScale}x</strong>
        </label>

        <p>
          {sampledIncidents.length < filteredIncidents.length
            ? `${formatInteger(sampledIncidents.length)} of ${formatInteger(
                filteredIncidents.length,
              )} filtered points rendered`
            : `${formatInteger(filteredIncidents.length)} filtered points rendered`}
        </p>
      </section>

      <aside className="crime-deck-map__stats" aria-label="Crime hotspot statistics">
        <article>
          <span>Total events</span>
          <strong>{formatInteger(incidents.length)}</strong>
          <small>{selectedMonthLabel ?? 'Selected period'}</small>
        </article>
        <article>
          <span>Highest hex</span>
          <strong>{maxHexCount ? formatInteger(maxHexCount) : '...'}</strong>
          <small>events in one cell</small>
        </article>
        <article>
          <span>Top borough</span>
          <strong>{topBorough}</strong>
          <small>highest incident area</small>
        </article>
      </aside>

      <div className="crime-deck-map__presets" aria-label="Camera presets">
        {VIEW_PRESETS.map((preset) => (
          <button type="button" key={preset.label} onClick={() => applyPreset(preset.viewState)}>
            {preset.label}
          </button>
        ))}
      </div>

      <footer className="crime-deck-map__explain">
        <div className="crime-deck-map__legend">
          <span>Incident Density</span>
          <div className="crime-deck-map__legend-bar" />
          <small>Low to high</small>
        </div>
        <p>
          Crime incidents are not evenly distributed across London. Tall towers indicate
          high-density clusters - concentrated in inner east London, parts of Westminster and
          major transport corridors.
        </p>
      </footer>
    </div>
  );
};

export default CrimeDeckMap;
