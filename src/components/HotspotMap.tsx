import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Rectangle, TileLayer, useMapEvents } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';
import type { FeatureCollection, Geometry } from 'geojson';
import { PALETTES } from '../lib/colors';
import { buildHotspotCells } from '../lib/hotspots';
import { buildQuantileBreaks, paletteForValue, scaleRadius } from '../lib/stats';
import type { BoroughProperties, HotspotCell, IncidentPayload, LsoaLookup } from '../types/data';
import MapLegend from './MapLegend';

type HotspotMapProps = {
  payload: IncidentPayload;
  selectedType: string;
  lookup: LsoaLookup;
  boroughs?: FeatureCollection<Geometry, BoroughProperties> | null;
  selectedCell: HotspotCell | null;
  onSelectCell: (cell: HotspotCell) => void;
};

const londonCenter: [number, number] = [51.5074, -0.1278];

const ViewWatcher = ({
  onChange,
}: {
  onChange: (bounds: LatLngBounds, zoom: number) => void;
}) => {
  const map = useMapEvents({
    moveend: () => onChange(map.getBounds(), map.getZoom()),
    zoomend: () => onChange(map.getBounds(), map.getZoom()),
  });

  useEffect(() => {
    onChange(map.getBounds(), map.getZoom());
  }, [map]);

  return null;
};

const HotspotMap = ({
  payload,
  selectedType,
  lookup,
  boroughs,
  selectedCell,
  onSelectCell,
}: HotspotMapProps) => {
  const [viewBounds, setViewBounds] = useState<LatLngBounds | null>(null);
  const [zoom, setZoom] = useState(10);
  const palette = PALETTES.density;

  const cells = useMemo(
    () => buildHotspotCells(payload, selectedType, lookup, viewBounds, zoom),
    [lookup, payload, selectedType, viewBounds, zoom],
  );

  const counts = cells.map((cell) => cell.count);
  const maxCount = counts[0] ?? 1;
  const breaks = buildQuantileBreaks(counts, palette.length);

  return (
    <div className="map-card">
      <div className="map-stage" style={{ height: 720 }}>
        <MapContainer
          center={londonCenter}
          zoom={10}
          className="leaflet-map"
          preferCanvas
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <ViewWatcher
            onChange={(bounds, nextZoom) => {
              setViewBounds(bounds);
              setZoom(nextZoom);
            }}
          />

          {boroughs ? (
            <GeoJSON
              key="borough-boundaries"
              data={boroughs as FeatureCollection}
              style={{
                color: '#f6d79a',
                weight: 1.2,
                opacity: 0.68,
                fillOpacity: 0,
                dashArray: '4 5',
              }}
              interactive={false}
            />
          ) : null}

          {cells.map((cell) => (
            <CircleMarker
              key={cell.id}
              center={cell.center}
              radius={scaleRadius(cell.count, maxCount)}
              pathOptions={{
                color: selectedCell?.id === cell.id ? '#ffe2a3' : 'rgba(255, 246, 232, 0.78)',
                weight: selectedCell?.id === cell.id ? 2 : 0.8,
                fillOpacity: selectedCell?.id === cell.id ? 0.95 : 0.76,
                fillColor: paletteForValue(cell.count, breaks, palette),
              }}
              eventHandlers={{ click: () => onSelectCell(cell) }}
            />
          ))}

          {selectedCell ? (
            <Rectangle
              bounds={selectedCell.bounds}
              pathOptions={{
                color: '#ffe2a3',
                weight: 1.8,
                fillOpacity: 0,
              }}
            />
          ) : null}
        </MapContainer>

        <div className="map-overlay map-overlay--legend">
          <MapLegend title="Visible hotspot cell counts" palette={palette} breaks={breaks} formatter={(value) => `${Math.round(value)}`} />
        </div>

        <div className="map-overlay map-overlay--caption">
          Hotspot cells are built from the underlying Q4 2025 geocoded incident records and update with the current zoom level.
        </div>
      </div>
    </div>
  );
};

export default HotspotMap;
