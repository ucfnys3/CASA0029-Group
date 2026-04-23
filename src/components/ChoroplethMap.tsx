import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import type { PathOptions } from 'leaflet';
import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet';
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
  valueFormatter: (value: number | null) => string;
  caption?: string;
  height?: number;
  fillContainer?: boolean;
  compact?: boolean;
  children?: ReactNode;
};

const londonCenter: [number, number] = [51.5074, -0.1278];

const ChoroplethMap = <T extends BaseMapProperties>({
  data,
  valueKey,
  paletteName,
  legendTitle,
  selectedCode,
  onSelect,
  valueFormatter,
  caption,
  height = 560,
  fillContainer = false,
  compact = false,
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
          <GeoJSON
            key={`${String(valueKey)}-${selectedCode ?? 'none'}`}
            data={data as FeatureCollection}
            style={(feature) => styleForProperties(feature?.properties as T)}
            onEachFeature={(feature, layer) => {
              const properties = feature.properties as T;
              const value = properties[valueKey];
              layer.bindTooltip(
                `<strong>${properties.name}</strong><br/>${valueFormatter(
                  typeof value === 'number' ? value : null,
                )}`,
              );
              layer.on({
                click: () => onSelect?.(properties),
                mouseover: (event) => {
                  event.target.setStyle({
                    weight: 1.6,
                    color: '#241b19',
                    fillOpacity: 0.95,
                  });
                },
                mouseout: (event) => {
                  event.target.setStyle(styleForProperties(properties));
                },
              });
            }}
          />
        </MapContainer>

        {breaks.length ? (
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
