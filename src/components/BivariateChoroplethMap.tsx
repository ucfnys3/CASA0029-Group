import { useEffect, type ReactNode } from 'react';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { geoJSON, type LeafletMouseEvent, type PathOptions } from 'leaflet';
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';
import { BIVARIATE_PALETTE, BIVARIATE_NO_DATA } from '../lib/colors';
import type { LsoaProperties, LsoaGeoJson } from '../types/data';

type BivariateChoroplethMapProps = {
  data: LsoaGeoJson | null;
  selectedCode?: string | null;
  highlightedCodes?: Set<string> | null;
  onSelect?: (feature: LsoaProperties) => void;
  onHover?: (feature: LsoaProperties, event: LeafletMouseEvent) => void;
  onHoverEnd?: () => void;
  caption?: string;
  fillContainer?: boolean;
  focusCode?: string | null;
  focusMaxZoom?: number;
  children?: ReactNode;
};

const londonCenter: [number, number] = [51.5074, -0.1278];

const BivariateViewportController = ({
  data,
  focusCode,
  focusMaxZoom = 14.5,
}: {
  data: LsoaGeoJson;
  focusCode?: string | null;
  focusMaxZoom?: number;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!focusCode) return;
    const feature = data.features.find((item) => item.properties?.code === focusCode);
    if (!feature) return;

    const bounds = geoJSON(feature as unknown as Feature<Geometry>).getBounds();
    if (!bounds.isValid()) return;

    map.flyToBounds(bounds.pad(0.45), {
      duration: 0.75,
      maxZoom: focusMaxZoom,
      paddingTopLeft: [260, 90],
      paddingBottomRight: [390, 90],
    });
  }, [data, focusCode, focusMaxZoom, map]);

  return null;
};

const binLabel = (crimeBin: number | null, vulnBin: number | null): string => {
  if (crimeBin == null || vulnBin == null) return 'No data';
  const levels = ['Low', 'Mid', 'High'];
  return `Crime ${levels[crimeBin]} · Pressure ${levels[vulnBin]}`;
};

const BivariateChoroplethMap = ({
  data,
  selectedCode,
  highlightedCodes,
  onSelect,
  onHover,
  onHoverEnd,
  caption,
  fillContainer = false,
  focusCode,
  focusMaxZoom,
  children,
}: BivariateChoroplethMapProps) => {
  const styleForProperties = (properties: LsoaProperties): PathOptions => {
    const bin = properties.bivariateBin;
    const fillColor =
      typeof bin === 'number' ? BIVARIATE_PALETTE[bin] : BIVARIATE_NO_DATA;

    const isSelected = selectedCode === properties.code;
    const isHighlighted = highlightedCodes?.has(properties.code) ?? false;
    const isDimmed = highlightedCodes && highlightedCodes.size > 0 && !isHighlighted;

    return {
      fillColor,
      fillOpacity: isSelected ? 0.96 : isDimmed ? 0.25 : 0.86,
      weight: isSelected ? 2.2 : isHighlighted ? 1.2 : 0.55,
      opacity: isDimmed ? 0.35 : 1,
      color: isSelected
        ? '#ffe2a3'
        : isHighlighted
          ? '#fff6e8'
          : 'rgba(255, 246, 232, 0.55)',
    };
  };

  if (!data) {
    return <div className="map-placeholder">Loading map data...</div>;
  }

  return (
    <div className="map-card">
      <div className={`map-stage${fillContainer ? ' map-stage--fill' : ''}`}>
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
          <BivariateViewportController
            data={data}
            focusCode={focusCode}
            focusMaxZoom={focusMaxZoom}
          />
          <GeoJSON
            key={`bivariate-${selectedCode ?? 'none'}-${highlightedCodes?.size ?? 0}`}
            data={data as FeatureCollection}
            style={(feature) =>
              styleForProperties(feature?.properties as LsoaProperties)
            }
            onEachFeature={(feature, layer) => {
              const properties = feature.properties as LsoaProperties;
              const crime = properties.crimeRate;
              const composite = properties.compositeVulnerabilityScore;
              layer.bindTooltip(
                `<strong>${properties.name}</strong><br/>` +
                  `${binLabel(properties.bivariateCrimeBin, properties.bivariateVulnBin)}<br/>` +
                  `Crime rate: ${crime != null ? crime.toFixed(1) + ' / 1k' : '—'}<br/>` +
                  `Composite: ${composite != null ? composite.toFixed(1) + ' / 100' : '—'}`,
              );
              layer.on({
                click: () => onSelect?.(properties),
                mouseover: (event) => {
                  onHover?.(properties, event);
                  event.target.setStyle({
                    weight: 1.8,
                    color: '#241b19',
                    fillOpacity: 0.96,
                  });
                },
                mousemove: (event) => {
                  onHover?.(properties, event);
                },
                mouseout: (event) => {
                  onHoverEnd?.();
                  event.target.setStyle(styleForProperties(properties));
                },
              });
            }}
          />
        </MapContainer>

        {caption ? <div className="map-overlay map-overlay--caption">{caption}</div> : null}
        {children}
      </div>
    </div>
  );
};

export default BivariateChoroplethMap;
