import { useEffect } from 'react';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { geoJSON, type LeafletMouseEvent, type PathOptions } from 'leaflet';
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';
import { CRIME_TYPE_PALETTE, CRIME_TYPE_LABELS } from '../lib/colors';

import type { LsoaProperties, LsoaGeoJson } from '../types/data';

/**
 * Quadrant classification using two independent axes:
 *   X = property share of crime (propertyRate / total, 0–100 %)
 *   Y = overall crime intensity  (crimeRateScore, 0–100 percentile)
 *
 * bin = highCrime * 2 + highProperty
 *   0: low crime, violence-led    (< 50 % property, low score)
 *   1: low crime, property-led    (≥ 50 % property, low score)
 *   2: high crime, violence-led   (< 50 % property, high score)
 *   3: high crime, property-led   (≥ 50 % property, high score)
 */
export const getPropertyShare = (p: LsoaProperties): number | null => {
  if (p.violentRate == null || p.propertyRate == null) return null;
  const total = p.violentRate + p.propertyRate;
  if (total === 0) return null;
  return (p.propertyRate / total) * 100;
};

export const getCrimeTypeBin = (p: LsoaProperties): number | null => {
  const propShare = getPropertyShare(p);
  if (propShare == null || p.crimeRateScore == null) return null;
  const highProperty = propShare >= 50 ? 1 : 0;
  const highCrime    = p.crimeRateScore > 50 ? 1 : 0;
  return highCrime * 2 + highProperty; // 0,1,2,3
};

type Props = {
  data: LsoaGeoJson;
  selectedCode?: string | null;
  highlightedCodes?: Set<string> | null;
  onSelect?: (feature: LsoaProperties) => void;
  fillContainer?: boolean;
  focusCode?: string | null;
};

const londonCenter: [number, number] = [51.5074, -0.1278];

const ViewportController = ({
  data, focusCode,
}: { data: LsoaGeoJson; focusCode?: string | null }) => {
  const map = useMap();
  useEffect(() => {
    if (!focusCode) return;
    const feat = data.features.find((f) => f.properties?.code === focusCode);
    if (!feat) return;
    const bounds = geoJSON(feat as unknown as Feature<Geometry>).getBounds();
    if (bounds.isValid())
      map.flyToBounds(bounds.pad(0.45), {
        duration: 0.75, maxZoom: 14.5,
        paddingTopLeft: [260, 90], paddingBottomRight: [390, 90],
      });
  }, [data, focusCode, map]);
  return null;
};

const CrimeTypeQuadrantMap = ({
  data, selectedCode, highlightedCodes, onSelect, fillContainer = false, focusCode,
}: Props) => {

  const styleFor = (p: LsoaProperties): PathOptions => {
    const bin = getCrimeTypeBin(p);
    const fillColor = bin != null ? CRIME_TYPE_PALETTE[bin] : '#888';
    const isSelected   = selectedCode === p.code;
    const isHighlighted = highlightedCodes?.has(p.code) ?? false;
    const isDimmed      = (highlightedCodes && highlightedCodes.size > 0) && !isHighlighted;
    return {
      fillColor,
      fillOpacity: isSelected ? 0.97 : isDimmed ? 0.22 : 0.82,
      weight:  isSelected ? 2.2 : isHighlighted ? 1.2 : 0.55,
      opacity: isDimmed ? 0.3 : 1,
      color:   isSelected ? '#ffe2a3' : isHighlighted ? '#fff6e8' : 'rgba(255,246,232,0.55)',
    };
  };

  return (
    <div className="map-card">
      <div className={`map-stage${fillContainer ? ' map-stage--fill' : ''}`}>
        <MapContainer center={londonCenter} zoom={10} className="leaflet-map" preferCanvas>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <ViewportController data={data} focusCode={focusCode} />
          <GeoJSON
            key={`ctq-${selectedCode ?? 'none'}-${highlightedCodes?.size ?? 0}`}
            data={data as FeatureCollection}
            style={(feature) => styleFor(feature?.properties as LsoaProperties)}
            onEachFeature={(feature, layer) => {
              const p = feature.properties as LsoaProperties;
              const bin = getCrimeTypeBin(p);
              const label = bin != null ? CRIME_TYPE_LABELS[bin] : 'No data';
              const propShare = getPropertyShare(p);
              layer.bindTooltip(
                `<strong>${p.name}</strong><br/>` +
                `${label}<br/>` +
                `Property share: ${propShare != null ? propShare.toFixed(1) + '%' : '—'}<br/>` +
                `Violent: ${p.violentRate != null ? p.violentRate.toFixed(1) + '/1k' : '—'} · ` +
                `Property: ${p.propertyRate != null ? p.propertyRate.toFixed(1) + '/1k' : '—'}`,
                { sticky: true, opacity: 0.9 },
              );
              layer.on({
                click: () => onSelect?.(p),
                mouseover: (e: LeafletMouseEvent) => {
                  e.target.setStyle({ weight: 1.8, color: '#241b19', fillOpacity: 0.96 });
                },
                mouseout: (e: LeafletMouseEvent) => {
                  e.target.setStyle(styleFor(p));
                  e.target.closeTooltip();
                },
              });
            }}
          />
        </MapContainer>
      </div>
    </div>
  );
};

export default CrimeTypeQuadrantMap;
