import { useMemo, useState } from 'react';
import ChoroplethMap from '../components/ChoroplethMap';
import PageHero from '../components/PageHero';
import RankingList from '../components/RankingList';
import Takeaway from '../components/Takeaway';
import { useJsonData } from '../hooks/useJsonData';
import { formatPercent, formatRate } from '../lib/format';
import type { LsoaGeoJson, LsoaProperties } from '../types/data';

const comparisonVariables = [
  {
    key: 'deprivation',
    label: 'Household deprivation',
    overlapKey: 'crimeDeprivationOverlap',
    framing:
      'The project materials consistently treat deprivation as one of the strongest signals of neighbourhood pressure.',
  },
  {
    key: 'privateRenting',
    label: 'Private renting',
    overlapKey: 'crimeRentingOverlap',
    framing:
      'Private renting matters here less as a lifestyle marker than as a proxy for insecurity, churn, and weaker residential stability.',
  },
  {
    key: 'unemployment',
    label: 'Unemployment',
    overlapKey: 'crimeUnemploymentOverlap',
    framing:
      'Weak labour-market attachment remains one of the clearest structural associations in the written analysis.',
  },
] as const;

const OverlapPage = () => {
  const { data, loading, error } = useJsonData<LsoaGeoJson>('/data/lsoa.geojson');
  const [selectedVariable, setSelectedVariable] =
    useState<(typeof comparisonVariables)[number]['key']>('deprivation');
  const [selectedLsoa, setSelectedLsoa] = useState<LsoaProperties | null>(null);

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
    return <div className="shell-width page-shell">Loading overlap maps...</div>;
  }

  if (!data || error) {
    return <div className="shell-width page-shell">Could not load the overlap page. {error}</div>;
  }

  return (
    <div className="shell-width page-shell">
      <PageHero
        eyebrow="Page 6"
        title="Crime and inequality together"
        description="Instead of treating crime and vulnerability as separate maps, this page places them side by side. The point is to inspect where high crime and structural pressure overlap most clearly rather than to reduce the city to one single explanation."
        note="The strongest overlap discussed in the background materials concerns insecurity, deprivation, housing instability, and weak labour-market attachment."
      />

      <section className="pill-row">
        {comparisonVariables.map((variable) => (
          <button
            key={variable.key}
            className={selectedVariable === variable.key ? 'pill-button active' : 'pill-button'}
            onClick={() => setSelectedVariable(variable.key)}
          >
            {variable.label}
          </button>
        ))}
      </section>

      <section className="comparison-grid">
        <div>
          <div className="comparison-grid__header">
            <span>Crime rate</span>
            <h3>2021 LSOA crime rate</h3>
          </div>
          <ChoroplethMap
            data={data}
            valueKey="crimeRate"
            paletteName="crime"
            legendTitle="Crime rate per 1,000 residents"
            selectedCode={activeLsoa?.code}
            onSelect={setSelectedLsoa}
            valueFormatter={formatRate}
            height={460}
            compact
            caption="This is the structural crime layer used for neighbourhood comparison."
          />
        </div>

        <div>
          <div className="comparison-grid__header">
            <span>{variableMeta.label}</span>
            <h3>{variableMeta.framing}</h3>
          </div>
          <ChoroplethMap
            data={data}
            valueKey={selectedVariable}
            paletteName="overlap"
            legendTitle={variableMeta.label}
            selectedCode={activeLsoa?.code}
            onSelect={setSelectedLsoa}
            valueFormatter={formatPercent}
            height={460}
            compact
            caption="Compare this map directly with the crime layer to spot high-high overlap."
          />
        </div>
      </section>

      <section className="panel-grid">
        <article className="panel-card">
          <p className="panel-card__eyebrow">Selected neighbourhood</p>
          <h3>{activeLsoa?.name ?? 'Click an area'}</h3>
          {activeLsoa ? (
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
          ) : (
            <p>Select a neighbourhood on either map to inspect the overlap more closely.</p>
          )}
        </article>

        <RankingList
          title={`Highest crime + ${variableMeta.label.toLowerCase()} overlap`}
          items={rankedOverlap.slice(0, 8).map((place) => ({
            title: place.name,
            subtitle: place.borough,
            value: formatPercent(place[variableMeta.overlapKey] as number | null),
            note: `Crime ${formatRate(place.crimeRate)} / ${variableMeta.label} ${formatPercent(
              place[selectedVariable] as number | null,
            )}`,
          }))}
        />
      </section>

      <Takeaway
        title="Takeaway"
        text="The overlap is strongest where crime pressure combines with deeper social and housing insecurity. That is why the atlas frames crime less as an isolated policing issue and more as part of a wider geography of urban risk."
      />
    </div>
  );
};

export default OverlapPage;
