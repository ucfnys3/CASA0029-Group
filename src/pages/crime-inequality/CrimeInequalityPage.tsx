import { useMemo, useState } from 'react';
import BivariateChoroplethMap from '../../components/BivariateChoroplethMap';
import BivariateLegend from '../../components/BivariateLegend';
import BivariateScatter, { pointsFromFeatures } from '../../components/BivariateScatter';
import GeoSearch, { type GeoSearchItem } from '../../components/GeoSearch';
import { useJsonData } from '../../hooks/useJsonData';
import { formatRate } from '../../lib/format';
import type { LsoaGeoJson, LsoaProperties } from '../../types/data';

const binLabelShort = (crime: number | null, vuln: number | null): string => {
  if (crime == null || vuln == null) return 'No data';
  const levels = ['low', 'mid', 'high'];
  return `${levels[crime]} crime / ${levels[vuln]} pressure`;
};

const CrimeInequalityPage = () => {
  const { data, loading, error } = useJsonData<LsoaGeoJson>('/data/lsoa.geojson');
  const [selectedLsoa, setSelectedLsoa] = useState<LsoaProperties | null>(null);
  const [focusedLsoaCode, setFocusedLsoaCode] = useState<string | null>(null);
  const [activeBin, setActiveBin] = useState<number | null>(null);

  const allProperties = useMemo<LsoaProperties[]>(() => {
    if (!data) return [];
    return data.features.map((feature) => feature.properties);
  }, [data]);

  const scatterPoints = useMemo(() => pointsFromFeatures(allProperties), [allProperties]);

  const lsoaSearchItems = useMemo<Array<GeoSearchItem<LsoaProperties>>>(() => {
    return allProperties
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((lsoa) => ({
        id: lsoa.code,
        primary: lsoa.name,
        secondary: lsoa.borough,
        tag: 'LSOA',
        meta: `${formatRate(lsoa.crimeRate)} | ${
          typeof lsoa.compositeVulnerabilityScore === 'number'
            ? `${lsoa.compositeVulnerabilityScore.toFixed(1)} pressure`
            : 'No pressure score'
        }`,
        searchText: `${lsoa.code} ${lsoa.name} ${lsoa.borough}`,
        payload: lsoa,
      }));
  }, [allProperties]);

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
    return <div className="fmap-page fmap-page--loading">Loading crime and pressure matrix...</div>;
  }

  if (!data || error) {
    return (
      <div className="fmap-page fmap-page--loading">
        Could not load the crime x pressure map. {error}
      </div>
    );
  }

  const handleScatterSelect = (code: string) => {
    const match = allProperties.find((p) => p.code === code);
    if (match) {
      setSelectedLsoa(match);
      setFocusedLsoaCode(match.code);
    }
  };

  return (
    <div className="fmap-page fmap-page--with-intro fmap-page--matrix">

      {/* ── Top intro bar ── */}
      <div className="cf-page-intro">
        <div className="cf-page-intro__lead">
          <p className="fmap-panel__kicker">Structural Analysis Section</p>
          <h2 className="cf-page-intro__title">Where do crime and structural pressure align?</h2>
          <p className="cf-page-intro__desc">
            After mapping the social and economic geography of pressure, this section compares
            that pattern with recorded crime rates. Crime rate and composite pressure are each
            split into tertiles and cross-tabulated, placing every London LSOA into a 3x3 matrix
            of alignment, mismatch, or resilience.
          </p>
        </div>
        <div className="cf-page-intro__guide">
          <div className="cf-page-intro__item">
            <strong>High crime + high pressure</strong>
            These are the strongest overlap areas: recorded crime and structural pressure are
            both elevated, so the structural explanation is most plausible here.
          </div>
          <div className="cf-page-intro__item">
            <strong>High crime + low pressure</strong>
            These places challenge a deprivation-only reading. They may reflect footfall,
            retail activity, nightlife, transport nodes, mobility, or other exposure mechanisms.
          </div>
          <div className="cf-page-intro__item">
            <strong>Low crime + high pressure</strong>
            These areas show pressure without the same recorded crime intensity, suggesting
            local protection, social infrastructure, or context not captured by the indicators.
          </div>
          <div className="cf-page-intro__item">
            <strong>Analytical role</strong>
            The matrix identifies where the theory is supported and where the project needs
            crime-type mechanisms or model sensitivity to refine the interpretation.
          </div>
        </div>
      </div>

      {/* ── Map area ── */}
      <div className="fmap-map-area">
      <div className="fmap-canvas">
        <BivariateChoroplethMap
          data={data}
          selectedCode={selectedLsoa?.code}
          highlightedCodes={highlightedCodes}
          onSelect={(lsoa) => {
            setSelectedLsoa(lsoa);
            setFocusedLsoaCode(null);
          }}
          focusCode={focusedLsoaCode}
          focusMaxZoom={14.5}
          fillContainer
        />
      </div>

      <aside className="fmap-panel fmap-panel--left">
        <p className="fmap-panel__kicker">Crime x pressure matrix</p>
        <BivariateLegend activeBin={activeBin} onCellClick={setActiveBin} />
        <p className="fmap-var-desc" style={{ marginTop: '0.6rem' }}>
          Click any cell to highlight matching LSOAs on both views.
        </p>
        <div className="fmap-takeaway" style={{ marginTop: '0.75rem' }}>
          <span className="fmap-takeaway__stat">{focalShare.toFixed(0)}%</span>
          <span>
            of LSOAs sit in the double-high bin, where the structural pressure argument is strongest.
          </span>
        </div>
      </aside>

      <aside className="fmap-panel fmap-panel--right fmap-panel--wide fmap-panel--scatter">
        <section className="bivariate-scatter-block" aria-label="Crime score vs pressure score">
          <div className="bivariate-scatter-block__head">
            <div>
              <p className="fmap-panel__kicker">Statistical view</p>
              <h3 className="fmap-panel__title" style={{ fontSize: '1rem' }}>
                Crime score vs pressure score
              </h3>
            </div>
            <span className="bivariate-scatter-block__count">
              {scatterPoints.length.toLocaleString()} LSOAs
            </span>
          </div>

          <BivariateScatter
            points={scatterPoints}
            selectedCode={selectedLsoa?.code}
            highlightedCodes={highlightedCodes}
            activeBin={activeBin}
            onSelect={handleScatterSelect}
            height={252}
            xLabel="Pressure score"
            yLabel="Crime score"
          />

        </section>

        <div className="fmap-divider" />

        <GeoSearch
          label="Find area"
          placeholder="LSOA code, name, or borough"
          helperText="Search by borough to list its LSOAs."
          items={lsoaSearchItems}
          maxResults={6}
          onSelect={(lsoa) => {
            setSelectedLsoa(lsoa);
            setFocusedLsoaCode(lsoa.code);
          }}
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
                    : 'No data'}
                </strong>
              </div>
            </div>
          </>
        ) : (
          <p className="fmap-panel__desc" style={{ fontSize: '0.78rem' }}>
            Click any LSOA on the map, or any dot on the scatter, to inspect where it sits on
            both axes.
          </p>
        )}

        <div className="fmap-divider" />

        <p className="fmap-panel__kicker">Where the theory bends</p>
        <p className="fmap-panel__desc" style={{ fontSize: '0.72rem' }}>
          The off-diagonal cells are not noise; they show where the theory needs a more precise
          mechanism. High-crime, low-pressure places may reflect target-rich activity centres,
          mobility, nightlife, retail, or other exposure patterns. High-pressure, low-crime
          places point toward local protection, social infrastructure, or under-measured context.
        </p>

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
          The matrix is a diagnostic device, not a final answer. It shows where the structural
          narrative is supported, where it bends, and where crime-type mechanisms or model
          sensitivity need to refine the story.
        </div>
      </aside>
      </div>{/* end fmap-map-area */}
    </div>
  );
};

export default CrimeInequalityPage;
