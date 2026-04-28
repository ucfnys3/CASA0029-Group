import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { FeatureCollection, GeoJsonObject, Geometry } from 'geojson';
import { geoJSON, type LeafletMouseEvent, type PathOptions } from 'leaflet';
import { GeoJSON as LeafletGeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';
import { PALETTES, type PaletteName } from '../lib/colors';
import { buildQuantileBreaks, paletteForValue } from '../lib/stats';
import MapLegend from './MapLegend';

type BaseMapProperties = {
  code: string;
  name: string;
  borough?: string;
  [key: string]: string | number | null | undefined;
};

type ChoroplethMapProps<T extends BaseMapProperties> = {
  data: FeatureCollection<Geometry, T> | null;
  valueKey: keyof T;
  paletteName: PaletteName;
  legendTitle: string;
  selectedCode?: string | null;
  onSelect?: (feature: T) => void;
  onHover?: (feature: T, event: LeafletMouseEvent) => void;
  onHoverEnd?: () => void;
  valueFormatter: (value: number | null) => string;
  caption?: string;
  height?: number;
  fillContainer?: boolean;
  compact?: boolean;
  showLegend?: boolean;
  focusCode?: string | null;
  resetViewKey?: number;
  focusMaxZoom?: number;
  children?: ReactNode;
};

const londonCenter: [number, number] = [51.5074, -0.1278];

const MapViewportController = <T extends BaseMapProperties>({
  data,
  focusCode,
  resetViewKey,
  compact,
  focusMaxZoom = 14,
}: {
  data: FeatureCollection<Geometry, T>;
  focusCode?: string | null;
  resetViewKey?: number;
  compact: boolean;
  focusMaxZoom?: number;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!focusCode) return;
    const feature = data.features.find((item) => item.properties?.code === focusCode);
    if (!feature) return;

    const bounds = geoJSON(feature as unknown as GeoJsonObject).getBounds();
    if (!bounds.isValid()) return;

    map.flyToBounds(bounds.pad(0.45), {
      duration: 0.75,
      maxZoom: focusMaxZoom,
      paddingTopLeft: [260, 90],
      paddingBottomRight: [390, 90],
    });
  }, [data, focusCode, focusMaxZoom, map]);

  useEffect(() => {
    if (resetViewKey == null || resetViewKey <= 0) return;
    map.flyTo(londonCenter, compact ? 9.6 : 10, {
      duration: 0.75,
    });
  }, [compact, map, resetViewKey]);

  return null;
};

const ChoroplethMap = <T extends BaseMapProperties>({
  data,
  valueKey,
  paletteName,
  legendTitle,
  selectedCode,
  onSelect,
  onHover,
  onHoverEnd,
  valueFormatter,
  caption,
  height = 560,
  fillContainer = false,
  compact = false,
  showLegend = true,
  focusCode,
  resetViewKey,
  focusMaxZoom,
  children,
}: ChoroplethMapProps<T>) => {
  const palette = PALETTES[paletteName];

  const numericValues = useMemo(() => {
    if (!data) return [];
    return data.features.reduce<number[]>((accumulator, feature) => {
      const value = feature.properties?.[valueKey];
      if (typeof value === 'number') {
        accumulator.push(value);
      }
      return accumulator;
    }, []);
  }, [data, valueKey]);

  const breaks = useMemo(
    () => buildQuantileBreaks(numericValues, palette.length),
    [numericValues, palette.length],
  );

  const styleForProperties = (properties: T): PathOptions => {
    const value = properties[valueKey];
    const fillColor = paletteForValue(
      typeof value === 'number' ? value : null,
      breaks,
      palette,
    );

    return {
      fillColor,
      fillOpacity: selectedCode === properties.code ? 0.96 : 0.84,
      weight: selectedCode === properties.code ? 2.2 : 0.65,
      opacity: 1,
      color: selectedCode === properties.code ? '#ffe2a3' : 'rgba(255, 246, 232, 0.78)',
    };
  };

  if (!data) {
    return <div className="map-placeholder">Loading map data...</div>;
  }

  return (
    <div className="map-card">
      <div className={`map-stage${fillContainer ? ' map-stage--fill' : ''}`} style={fillContainer ? undefined : { height }}>
        <MapContainer
          center={londonCenter}
          zoom={compact ? 9.6 : 10}
          zoomControl={!compact}
          className="leaflet-map"
          preferCanvas
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapViewportController
            data={data}
            focusCode={focusCode}
            resetViewKey={resetViewKey}
            compact={compact}
            focusMaxZoom={focusMaxZoom}
          />
          <LeafletGeoJSON
            key={`${String(valueKey)}-${selectedCode ?? 'none'}`}
            data={data as FeatureCollection}
            style={(feature) => styleForProperties(feature?.properties as T)}
            onEachFeature={(feature, layer) => {
              const properties = feature.properties as T;
              const value = properties[valueKey];
              if (showLegend) {
                layer.bindTooltip(
                  `<strong>${properties.name}</strong><br/>${valueFormatter(
                    typeof value === 'number' ? value : null,
                  )}`,
                );
              }
              layer.on({
                click: () => onSelect?.(properties),
                mouseover: (event) => {
                  onHover?.(properties, event);
                  event.target.setStyle({
                    weight: 1.6,
                    color: '#241b19',
                    fillOpacity: 0.95,
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

        {showLegend && breaks.length ? (
          <div className="map-overlay map-overlay--legend">
            <MapLegend title={legendTitle} palette={palette} breaks={breaks} formatter={valueFormatter} />
          </div>
        ) : null}

        {caption ? <div className="map-overlay map-overlay--caption">{caption}</div> : null}
        {children}
      </div>
    </div>
  );
};

export default ChoroplethMap;
