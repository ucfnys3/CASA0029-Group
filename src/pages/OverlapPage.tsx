import { useMemo, useState } from 'react';
import ChoroplethMap from '../components/ChoroplethMap';
import LollipopChart from '../components/LollipopChart';
import { useJsonData } from '../hooks/useJsonData';
import { formatPercent, formatRate } from '../lib/format';
import type { LsoaGeoJson, LsoaProperties } from '../types/data';

const comparisonVariables = [
  {
    key: 'deprivation',
    label: 'Deprivation',
    overlapKey: 'crimeDeprivationOverlap',
    framing: 'Deprivation is one of the strongest signals of neighbourhood pressure.',
  },
  {
    key: 'privateRenting',
    label: 'Private renting',
    overlapKey: 'crimeRentingOverlap',
    framing: 'Private renting proxies insecurity, churn, and weaker residential stability.',
  },
  {
    key: 'unemployment',
    label: 'Unemployment',
    overlapKey: 'crimeUnemploymentOverlap',
    framing: 'Weak labour-market attachment is among the clearest structural associations.',
  },
] as const;

type MapView = 'overlap' | 'crime' | 'variable';

const OverlapPage = () => {
  const { data, loading, error } = useJsonData<LsoaGeoJson>('/data/lsoa.geojson');
  const [selectedVariable, setSelectedVariable] =
    useState<(typeof comparisonVariables)[number]['key']>('deprivation');
  const [selectedLsoa, setSelectedLsoa] = useState<LsoaProperties | null>(null);
  const [mapView, setMapView] = useState<MapView>('overlap');

  const variableMeta = comparisonVariables.find((item) => item.key === selectedVariable)!;

  const rankedOverlap = useMemo(() => {
    if (!data) return [];
    return data.features
      .map((feature) => feature.properties)
      .filter((properties) => typeof properties[variableMeta.overlapKey] === 'number')
      .sort(
        (left, right) =>
          Number(right[variableMeta.overlapKey]) - Number(left[variableMeta.overlapKey]),
      );
  }, [data, variableMeta.overlapKey]);

  const activeLsoa = selectedLsoa ?? rankedOverlap[0] ?? null;

  if (loading) {
    return <div className="fmap-page fmap-page--loading">Loading overlap maps…</div>;
  }

  if (!data || error) {
    return <div className="fmap-page fmap-page--loading">Could not load the overlap page. {error}</div>;
  }

  const activeValueKey =
    mapView === 'overlap' ? variableMeta.overlapKey : mapView === 'crime' ? 'crimeRate' : selectedVariable;
  const activePalette =
    mapView === 'crime' ? 'crime' : 'overlap';
  const activeLegend =
    mapView === 'overlap'
      ? `Crime × ${variableMeta.label} overlap`
      : mapView === 'crime'
        ? 'Crime rate per 1,000 residents'
        : variableMeta.label;
  const activeFormatter =
    mapView === 'crime' ? formatRate : formatPercent;

  return (
    <div className="fmap-page">
      {/* Map fills the stage */}
      <div className="fmap-canvas">
        <ChoroplethMap
          data={data}
          valueKey={activeValueKey as keyof LsoaProperties}
          paletteName={activePalette}
          legendTitle={activeLegend}
          selectedCode={activeLsoa?.code}
          onSelect={setSelectedLsoa}
          valueFormatter={activeFormatter}
          fillContainer
        />
      </div>

      {/* Left floating panel: controls */}
      <aside className="fmap-panel fmap-panel--left">
        <p className="fmap-panel__kicker">Page 6 · Crime & Inequality</p>
        <h2 className="fmap-panel__title">Compare layers</h2>
        <p className="fmap-panel__desc">
          Where do crime and structural pressure overlap most clearly?
        </p>

        <div className="fmap-section-label">Structural indicator</div>
        <div className="fmap-var-list">
          {comparisonVariables.map((variable) => (
            <button
              key={variable.key}
              className={`fmap-var-btn${selectedVariable === variable.key ? ' active' : ''}`}
              onClick={() => {
                setSelectedVariable(variable.key);
                setSelectedLsoa(null);
              }}
            >
              {variable.label}
            </button>
          ))}
        </div>

        <div className="fmap-section-label">Map layer</div>
        <div className="fmap-var-list">
          {([
            { value: 'overlap', label: 'Overlap score' },
            { value: 'crime',    label: 'Crime rate' },
            { value: 'variable', label: variableMeta.label },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              className={`fmap-var-btn${mapView === opt.value ? ' active' : ''}`}
              onClick={() => setMapView(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="fmap-var-desc">{variableMeta.framing}</p>
      </aside>

      {/* Right floating panel: stats + details */}
      <aside className="fmap-panel fmap-panel--right fmap-panel--wide">
        {/* Lollipop chart — statistical evidence */}
        <LollipopChart />

        <div className="fmap-divider" />

        {/* Selected neighbourhood */}
        <p className="fmap-panel__kicker">Selected neighbourhood</p>
        <h3 className="fmap-panel__title" style={{ fontSize: '1rem' }}>
          {activeLsoa?.name ?? 'Click an area'}
        </h3>

        {activeLsoa && (
          <div className="metric-list">
            <div>
              <span>Borough</span>
              <strong>{activeLsoa.borough}</strong>
            </div>
            <div>
              <span>Crime rate</span>
              <strong>{formatRate(activeLsoa.crimeRate)}</strong>
            </div>
            <div>
              <span>{variableMeta.label}</span>
              <strong>{formatPercent(activeLsoa[selectedVariable] as number | null)}</strong>
            </div>
            <div>
              <span>Overlap score</span>
              <strong>{formatPercent(activeLsoa[variableMeta.overlapKey] as number | null)}</strong>
            </div>
          </div>
        )}

        <div className="fmap-section-label" style={{ marginTop: '0.75rem' }}>
          Highest overlap — top 6
        </div>
        <ol className="cmd__ranking">
          {rankedOverlap.slice(0, 6).map((place, i) => (
            <li key={place.code} className="cmd__ranking__item">
              <span className="cmd__ranking__rank">{i + 1}</span>
              <div className="cmd__ranking__body">
                <strong>{place.name}</strong>
                <small>{place.borough}</small>
              </div>
              <span className="cmd__ranking__value">
                {formatPercent(place[variableMeta.overlapKey] as number | null)}
              </span>
            </li>
          ))}
        </ol>

        <div className="fmap-takeaway">
          The overlap is strongest where crime combines with housing insecurity and labour-market
          weakness — consistent with social disorganisation theory.
        </div>
      </aside>
    </div>
  );
};

export default OverlapPage;
