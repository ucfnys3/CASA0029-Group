import { useMemo, useState } from 'react';
import ChoroplethMap from '../components/ChoroplethMap';
import { useJsonData } from '../hooks/useJsonData';
import { formatPercent, formatRate } from '../lib/format';
import type { LsoaGeoJson, LsoaProperties, SummaryData } from '../types/data';

const PriorityPlacesPage = () => {
  const { data: summary, loading: summaryLoading, error: summaryError } =
    useJsonData<SummaryData>('/data/summary.json');
  const { data, loading, error } = useJsonData<LsoaGeoJson>('/data/lsoa.geojson');
  const [selectedLsoa, setSelectedLsoa] = useState<LsoaProperties | null>(null);

  const rankedIndex = useMemo(() => {
    if (!data) return [];
    return data.features
      .map((feature) => feature.properties)
      .filter((properties) => typeof properties.priorityIndex === 'number')
      .sort((left, right) => Number(right.priorityIndex) - Number(left.priorityIndex));
  }, [data]);

  if (loading || summaryLoading) {
    return <div className="fmap-page fmap-page--loading">Loading priority places…</div>;
  }

  if (!data || !summary || error || summaryError) {
    return (
      <div className="fmap-page fmap-page--loading">
        Could not load the priority index page. {error ?? summaryError}
      </div>
    );
  }

  const activeLsoa = selectedLsoa ?? rankedIndex[0] ?? null;

  return (
    <div className="fmap-page">
      {/* Map fills the stage */}
      <div className="fmap-canvas">
        <ChoroplethMap
          data={data}
          valueKey="priorityIndex"
          paletteName="priority"
          legendTitle="Crime Vulnerability Index"
          selectedCode={activeLsoa?.code}
          onSelect={setSelectedLsoa}
          valueFormatter={formatPercent}
          fillContainer
          caption="Darker areas combine high crime rates with stronger structural vulnerability."
        />
      </div>

      {/* Left floating panel: methodology */}
      <aside className="fmap-panel fmap-panel--left">
        <p className="fmap-panel__kicker">Page 7 · Priority Places</p>
        <h2 className="fmap-panel__title">Crime Vulnerability Index</h2>
        <p className="fmap-panel__desc">
          This final synthesis combines crime with structural indicators into a comparative index.
          It is not a causal model — it shows where multiple pressures stack up most clearly.
        </p>

        <div className="fmap-index-legend">
          <div className="fmap-index-legend__item">
            <span className="fmap-index-legend__dot fmap-index-legend__dot--high" />
            <span>High crime + high vulnerability</span>
          </div>
          <div className="fmap-index-legend__item">
            <span className="fmap-index-legend__dot fmap-index-legend__dot--mid" />
            <span>Moderate combined pressure</span>
          </div>
          <div className="fmap-index-legend__item">
            <span className="fmap-index-legend__dot fmap-index-legend__dot--low" />
            <span>Lower combined risk</span>
          </div>
        </div>

        <p className="fmap-panel__note">
          Equal weights across crime rate, unemployment, private renting, deprivation, bad health,
          overcrowding, and youth share. Robust min-max scaling reduces outlier pull.
        </p>

        <div className="fmap-takeaway">
          The highest-ranked places are not just high-crime — they are places where crime
          coincides with broader exclusion, insecurity, and vulnerability.
        </div>
      </aside>

      {/* Right floating panel: selected place + ranking */}
      <aside className="fmap-panel fmap-panel--right">
        <p className="fmap-panel__kicker">Selected place</p>
        <h3 className="fmap-panel__title">{activeLsoa?.name ?? 'Click a neighbourhood'}</h3>

        {activeLsoa ? (
          <div className="metric-list">
            <div>
              <span>Borough</span>
              <strong>{activeLsoa.borough}</strong>
            </div>
            <div>
              <span>Index score</span>
              <strong>{formatPercent(activeLsoa.priorityIndex)}</strong>
            </div>
            <div>
              <span>Crime rate</span>
              <strong>{formatRate(activeLsoa.crimeRate)}</strong>
            </div>
            <div>
              <span>Unemployment</span>
              <strong>{formatPercent(activeLsoa.unemployment)}</strong>
            </div>
            <div>
              <span>Private renting</span>
              <strong>{formatPercent(activeLsoa.privateRenting)}</strong>
            </div>
            <div>
              <span>Household deprivation</span>
              <strong>{formatPercent(activeLsoa.deprivation)}</strong>
            </div>
            <div>
              <span>Bad health</span>
              <strong>{formatPercent(activeLsoa.badHealth)}</strong>
            </div>
          </div>
        ) : (
          <p className="fmap-panel__desc">Click a neighbourhood to inspect its index profile.</p>
        )}

        <div className="fmap-section-label" style={{ marginTop: '0.9rem' }}>
          Highest index scores
        </div>
        <ol className="cmd__ranking">
          {summary.structural.priorityPlaces.slice(0, 10).map((place, i) => (
            <li key={place.name} className="cmd__ranking__item">
              <span className="cmd__ranking__rank">{i + 1}</span>
              <div className="cmd__ranking__body">
                <strong>{place.name}</strong>
                <small>{place.borough}</small>
              </div>
              <span className="cmd__ranking__value">{formatPercent(place.priorityIndex)}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
};

export default PriorityPlacesPage;
