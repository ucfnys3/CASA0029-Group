import { useMemo, useState } from 'react';
import BivariateChoroplethMap from '../components/BivariateChoroplethMap';
import BivariateLegend from '../components/BivariateLegend';
import BivariateScatter, { pointsFromFeatures } from '../components/BivariateScatter';
import { useJsonData } from '../hooks/useJsonData';
import { formatRate } from '../lib/format';
import type { LsoaGeoJson, LsoaProperties } from '../types/data';

const binLabelShort = (crime: number | null, vuln: number | null): string => {
  if (crime == null || vuln == null) return 'No data';
  const levels = ['low', 'mid', 'high'];
  return `${levels[crime]}-crime · ${levels[vuln]}-pressure`;
};

const OverlapPage = () => {
  const { data, loading, error } = useJsonData<LsoaGeoJson>('/data/lsoa.geojson');
  const [selectedLsoa, setSelectedLsoa] = useState<LsoaProperties | null>(null);
  const [activeBin, setActiveBin] = useState<number | null>(null);

  const allProperties = useMemo<LsoaProperties[]>(() => {
    if (!data) return [];
    return data.features.map((feature) => feature.properties);
  }, [data]);

  const scatterPoints = useMemo(() => pointsFromFeatures(allProperties), [allProperties]);

  const binCounts = useMemo(() => {
    const counts = new Array<number>(9).fill(0);
    allProperties.forEach((p) => {
      if (typeof p.bivariateBin === 'number') counts[p.bivariateBin] += 1;
    });
    return counts;
  }, [allProperties]);

  const focalCount = binCounts[8];
  const totalClassified = binCounts.reduce((a, b) => a + b, 0);
  const focalShare = totalClassified ? (focalCount / totalClassified) * 100 : 0;

  const crimeNoPressure = useMemo(() => {
    return allProperties
      .filter(
        (p) =>
          typeof p.crimeRateScore === 'number' &&
          typeof p.compositeVulnerabilityScore === 'number' &&
          p.crimeRateScore >= 75 &&
          p.compositeVulnerabilityScore <= 40,
      )
      .sort(
        (a, b) =>
          (b.crimeRateScore as number) - (a.crimeRateScore as number),
      )
      .slice(0, 5);
  }, [allProperties]);

  const pressureNoCrime = useMemo(() => {
    return allProperties
      .filter(
        (p) =>
          typeof p.crimeRateScore === 'number' &&
          typeof p.compositeVulnerabilityScore === 'number' &&
          p.compositeVulnerabilityScore >= 75 &&
          p.crimeRateScore <= 40,
      )
      .sort(
        (a, b) =>
          (b.compositeVulnerabilityScore as number) -
          (a.compositeVulnerabilityScore as number),
      )
      .slice(0, 5);
  }, [allProperties]);

  const highlightedCodes = useMemo(() => {
    if (activeBin == null) return null;
    const set = new Set<string>();
    allProperties.forEach((p) => {
      if (p.bivariateBin === activeBin) set.add(p.code);
    });
    return set;
  }, [allProperties, activeBin]);

  if (loading) {
    return <div className="fmap-page fmap-page--loading">Loading bivariate map…</div>;
  }

  if (!data || error) {
    return (
      <div className="fmap-page fmap-page--loading">
        Could not load the crime × pressure map. {error}
      </div>
    );
  }

  const handleScatterSelect = (code: string) => {
    const match = allProperties.find((p) => p.code === code);
    if (match) setSelectedLsoa(match);
  };

  return (
    <div className="fmap-page">
      <div className="fmap-canvas">
        <BivariateChoroplethMap
          data={data}
          selectedCode={selectedLsoa?.code}
          highlightedCodes={highlightedCodes}
          onSelect={setSelectedLsoa}
          fillContainer
        />
      </div>

      <aside className="fmap-panel fmap-panel--left">
        <p className="fmap-panel__kicker">Page 5 · Crime × Pressure</p>
        <h2 className="fmap-panel__title">Where do the two surfaces coincide?</h2>
        <p className="fmap-panel__desc">
          Page 4 mapped structural pressure. Page 3 mapped crime. A bivariate classification
          splits both into tertiles — low, mid, high — and cross-tabs them. Each LSOA lands in
          one of nine bins, coloured by how the two signals combine.
        </p>

        <BivariateLegend activeBin={activeBin} onCellClick={setActiveBin} />

        <p className="fmap-var-desc" style={{ marginTop: '0.75rem' }}>
          Click a legend cell to highlight neighbourhoods in that bin. Deep focal colour (top-right)
          = <strong>high crime AND high pressure</strong>. Warm edge (bottom-right) = pressure without
          crime. Cool edge (top-left) = crime without pressure.
        </p>

        <div className="fmap-takeaway">
          {focalCount.toLocaleString()} of {totalClassified.toLocaleString()} LSOAs
          ({focalShare.toFixed(0)}%) fall in the double-high bin. Social disorganisation theory
          predicts coincidence — the map lets you see where the prediction holds and where it
          breaks.
        </div>
      </aside>

      <aside className="fmap-panel fmap-panel--right fmap-panel--wide">
        <p className="fmap-panel__kicker">Statistical view</p>
        <h3 className="fmap-panel__title" style={{ fontSize: '1rem' }}>
          Crime score vs pressure score
        </h3>
        <p className="fmap-panel__desc" style={{ fontSize: '0.78rem' }}>
          Each dot is one LSOA ({scatterPoints.length.toLocaleString()} complete). Dashed lines
          mark the tertile cuts used on the map — the dense cloud along the diagonal is the
          signal the map encodes.
        </p>

        <BivariateScatter
          points={scatterPoints}
          selectedCode={selectedLsoa?.code}
          highlightedCodes={highlightedCodes}
          activeBin={activeBin}
          onSelect={handleScatterSelect}
        />

        <div className="fmap-divider" />

        {selectedLsoa ? (
          <>
            <p className="fmap-panel__kicker">Selected neighbourhood</p>
            <h3 className="fmap-panel__title" style={{ fontSize: '1rem' }}>
              {selectedLsoa.name}
            </h3>
            <div className="metric-list">
              <div>
                <span>Borough</span>
                <strong>{selectedLsoa.borough}</strong>
              </div>
              <div>
                <span>Bivariate bin</span>
                <strong>
                  {binLabelShort(
                    selectedLsoa.bivariateCrimeBin,
                    selectedLsoa.bivariateVulnBin,
                  )}
                </strong>
              </div>
              <div>
                <span>Crime rate</span>
                <strong>{formatRate(selectedLsoa.crimeRate)}</strong>
              </div>
              <div>
                <span>Composite pressure</span>
                <strong>
                  {typeof selectedLsoa.compositeVulnerabilityScore === 'number'
                    ? `${selectedLsoa.compositeVulnerabilityScore.toFixed(1)} / 100`
                    : '—'}
                </strong>
              </div>
            </div>
          </>
        ) : (
          <p className="fmap-panel__desc" style={{ fontSize: '0.78rem' }}>
            Click any LSOA on the map — or any dot on the scatter — to inspect where it sits on
            both axes.
          </p>
        )}

        <div className="fmap-divider" />

        <p className="fmap-panel__kicker">Where the theory bends</p>

        <div className="fmap-section-label" style={{ marginTop: '0.25rem' }}>
          High crime despite low pressure
        </div>
        <ol className="cmd__ranking cmd__ranking--bivariate">
          {crimeNoPressure.length ? (
            crimeNoPressure.map((place, i) => (
              <li key={place.code} className="cmd__ranking__item">
                <span className="cmd__ranking__rank">{i + 1}</span>
                <div className="cmd__ranking__body">
                  <strong>{place.name}</strong>
                  <small>{place.borough}</small>
                </div>
                <span className="cmd__ranking__pair">
                  <span className="cmd__ranking__pair-row">
                    <em>crime</em>
                    {formatRate(place.crimeRate)}
                  </span>
                  <span className="cmd__ranking__pair-row cmd__ranking__pair-row--muted">
                    <em>pressure</em>
                    {(place.compositeVulnerabilityScore ?? 0).toFixed(0)} / 100
                  </span>
                </span>
              </li>
            ))
          ) : (
            <li className="cmd__ranking__item">
              <div className="cmd__ranking__body">
                <small>None above threshold.</small>
              </div>
            </li>
          )}
        </ol>

        <div className="fmap-section-label" style={{ marginTop: '0.5rem' }}>
          High pressure despite low crime
        </div>
        <ol className="cmd__ranking cmd__ranking--bivariate">
          {pressureNoCrime.length ? (
            pressureNoCrime.map((place, i) => (
              <li key={place.code} className="cmd__ranking__item">
                <span className="cmd__ranking__rank">{i + 1}</span>
                <div className="cmd__ranking__body">
                  <strong>{place.name}</strong>
                  <small>{place.borough}</small>
                </div>
                <span className="cmd__ranking__pair">
                  <span className="cmd__ranking__pair-row">
                    <em>pressure</em>
                    {(place.compositeVulnerabilityScore ?? 0).toFixed(0)} / 100
                  </span>
                  <span className="cmd__ranking__pair-row cmd__ranking__pair-row--muted">
                    <em>crime</em>
                    {formatRate(place.crimeRate)}
                  </span>
                </span>
              </li>
            ))
          ) : (
            <li className="cmd__ranking__item">
              <div className="cmd__ranking__body">
                <small>None above threshold.</small>
              </div>
            </li>
          )}
        </ol>

        <div className="fmap-takeaway">
          The off-diagonal cases matter: West End streets carry tourist-driven crime without
          structural pressure, while outer-London estates carry pressure without matching crime.
          Page 6 ranks where intervention should land when both converge.
        </div>
      </aside>
    </div>
  );
};

export default OverlapPage;
