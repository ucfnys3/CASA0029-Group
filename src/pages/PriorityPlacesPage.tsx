import { useMemo, useState } from 'react';
import ChoroplethMap from '../components/ChoroplethMap';
import PageHero from '../components/PageHero';
import RankingList from '../components/RankingList';
import Takeaway from '../components/Takeaway';
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
    return <div className="shell-width page-shell">Loading priority places...</div>;
  }

  if (!data || !summary || error || summaryError) {
    return (
      <div className="shell-width page-shell">
        Could not load the priority index page. {error ?? summaryError}
      </div>
    );
  }

  const activeLsoa = selectedLsoa ?? rankedIndex[0] ?? null;

  return (
    <div className="shell-width page-shell">
      <PageHero
        eyebrow="Page 7"
        title="Priority places"
        description="This final synthesis page combines crime with the structural indicators into a comparative Crime Vulnerability Index. It is not a causal model; it is a way to summarise where multiple pressures stack up most clearly."
        note="The index uses equal weights across crime rate, unemployment, private renting, deprivation, bad health, overcrowding, and youth share, with robust min-max scaling to reduce the pull of extreme outliers."
      />

      <section className="panel-split panel-split--map-heavy">
        <ChoroplethMap
          data={data}
          valueKey="priorityIndex"
          paletteName="priority"
          legendTitle="Crime Vulnerability Index"
          selectedCode={activeLsoa?.code}
          onSelect={setSelectedLsoa}
          valueFormatter={formatPercent}
          caption="Darker areas combine high crime rates with stronger structural vulnerability across the selected indicators."
        />

        <div className="stack-column">
          <article className="panel-card panel-card--sticky">
            <p className="panel-card__eyebrow">How the index works</p>
            <h3>Comparative, not causal</h3>
            <p>
              The index is designed to help compare places, not to claim that one variable
              mechanically causes crime. Equal weighting keeps the method transparent for a public
              audience.
            </p>
          </article>

          <article className="panel-card">
            <p className="panel-card__eyebrow">Selected place</p>
            <h3>{activeLsoa?.name ?? 'Choose an area'}</h3>
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
              <p>Click a neighbourhood to inspect its index profile.</p>
            )}
          </article>

          <RankingList
            title="Highest index scores"
            items={summary.structural.priorityPlaces.slice(0, 10).map((place) => ({
              title: place.name,
              subtitle: place.borough,
              value: formatPercent(place.priorityIndex),
              note: `Crime ${formatRate(place.crimeRate)} / Unemployment ${formatPercent(
                place.unemployment,
              )}`,
            }))}
          />
        </div>
      </section>

      <Takeaway
        title="Takeaway"
        text="The priority map pulls the story together. The highest-ranked places are not simply the ones with the highest crime rates; they are places where crime coincides with broader patterns of exclusion, insecurity, and neighbourhood vulnerability."
      />
    </div>
  );
};

export default PriorityPlacesPage;
