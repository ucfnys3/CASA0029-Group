import { useMemo, useState } from 'react';
import CrimeTypeQuadrantMap, { getCrimeTypeBin, getPropertyShare } from '../../components/CrimeTypeQuadrantMap';
import CrimeTypeScatter, { pointsFromLsoa } from '../../components/CrimeTypeScatter';
import CrimeTypeLegend from '../../components/CrimeTypeLegend';
import CorrelationDivergingChart, { type CorrelationRow } from '../../components/CorrelationDivergingChart';
import { useJsonData } from '../../hooks/useJsonData';
import { formatRate } from '../../lib/format';
import { CRIME_TYPE_PALETTE, CRIME_TYPE_LABELS } from '../../lib/colors';
import type { LsoaGeoJson, LsoaProperties } from '../../types/data';

type CrimeCorrelationsJson = {
  summary: {
    violent:  { mean: number; median: number; totalCount: number };
    property: { mean: number; median: number; totalCount: number };
    lsoaCount: number;
    year: number;
  };
  correlations: CorrelationRow[];
};

const fmtRate = (v: number | null | undefined) =>
  v != null ? `${v.toFixed(1)} per 1,000` : '—';

const CrimeTypeDivergencePage = () => {
  const { data: geoData, loading: geoLoading, error: geoError } =
    useJsonData<LsoaGeoJson>('/data/lsoa.geojson');
  const { data: corrData, loading: corrLoading } =
    useJsonData<CrimeCorrelationsJson>('/data/crime_correlations.json');

  const [selectedLsoa, setSelectedLsoa] = useState<LsoaProperties | null>(null);
  const [activeBin, setActiveBin]       = useState<number | null>(null);
  const [focusedCode, setFocusedCode]   = useState<string | null>(null);

  /* ── derived data ── */
  const allProperties = useMemo<LsoaProperties[]>(() => {
    if (!geoData) return [];
    return geoData.features.map((f) => f.properties);
  }, [geoData]);

  const scatterPoints = useMemo(() => pointsFromLsoa(allProperties), [allProperties]);

  const binCounts = useMemo(() => {
    const counts = [0, 0, 0, 0];
    allProperties.forEach((p) => {
      const b = getCrimeTypeBin(p);
      if (b != null) counts[b]++;
    });
    return counts;
  }, [allProperties]);

  const highlightedCodes = useMemo(() => {
    if (activeBin == null) return null;
    const s = new Set<string>();
    allProperties.forEach((p) => { if (getCrimeTypeBin(p) === activeBin) s.add(p.code); });
    return s;
  }, [allProperties, activeBin]);

  const correlations = useMemo(() => corrData?.correlations ?? [], [corrData]);
  const total = binCounts.reduce((a, b) => a + b, 0);

  const handleScatterSelect = (code: string) => {
    const match = allProperties.find((p) => p.code === code);
    if (match) { setSelectedLsoa(match); setFocusedCode(match.code); }
  };

  /* ── loading / error ── */
  if (geoLoading || corrLoading)
    return <div className="fmap-page fmap-page--loading">Loading crime type data…</div>;
  if (!geoData || geoError)
    return <div className="fmap-page fmap-page--loading">Could not load data. {geoError}</div>;

  return (
    <div className="fmap-page">

      {/* ── Full-screen quadrant map ── */}
      <div className="fmap-canvas">
        <CrimeTypeQuadrantMap
          data={geoData}
          selectedCode={selectedLsoa?.code}
          highlightedCodes={highlightedCodes}
          onSelect={(p) => { setSelectedLsoa(p); setFocusedCode(null); }}
          focusCode={focusedCode}
          fillContainer
        />
      </div>

      {/* ── Left panel: legend + description + bin stats ── */}
      <aside className="fmap-panel fmap-panel--left">
        <p className="fmap-panel__kicker">Crime-Type Mechanism Section</p>
        <h2 className="fmap-panel__title">Two crimes, two logics</h2>
        <p className="fmap-panel__desc">
          Each LSOA is placed on two axes: <strong>how much of its crime is property-type</strong>{' '}
          (X, 0–100%) and <strong>how intense its overall crime is</strong> (Y, percentile rank).
          The 50% share boundary separates violence-led from property-led areas, regardless of
          total crime level.
        </p>

        <CrimeTypeLegend activeBin={activeBin} onCellClick={setActiveBin} />

        <p className="fmap-var-desc" style={{ fontSize: '0.7rem' }}>
          Click a quadrant to highlight matching LSOAs on the map and scatter.
        </p>

        {/* Bin counts */}
        <div className="ct-bin-counts">
          {([2, 3, 0, 1] as const).map((bin) => (
            <div key={bin} className="ct-bin-count">
              <span
                className="ct-bin-count__swatch"
                style={{ background: CRIME_TYPE_PALETTE[bin] }}
              />
              <span className="ct-bin-count__label">{CRIME_TYPE_LABELS[bin]}</span>
              <span className="ct-bin-count__n">
                {binCounts[bin].toLocaleString()}
                <em> ({total ? ((binCounts[bin] / total) * 100).toFixed(0) : 0}%)</em>
              </span>
            </div>
          ))}
        </div>

        <div className="fmap-takeaway">
          <strong>Violent:</strong> Violence Against the Person + Robbery<br />
          <strong>Property:</strong> Theft + Burglary + Vehicle Offences<br />
          <span style={{ color: 'rgba(255,238,206,0.55)', fontSize: '0.7rem' }}>
            MPS 2021 full-year counts, per-1,000 residents
          </span>
        </div>
      </aside>

      {/* ── Right panel: scatter + correlation chart + selected LSOA ── */}
      <aside className="fmap-panel fmap-panel--right fmap-panel--wide fmap-panel--scatter">

        {/* Scatter */}
        <section className="bivariate-scatter-block">
          <div className="bivariate-scatter-block__head">
            <div>
              <p className="fmap-panel__kicker">Quadrant scatter</p>
              <h3 className="fmap-panel__title" style={{ fontSize: '1rem' }}>
                Property share vs crime intensity
              </h3>
            </div>
            <span className="bivariate-scatter-block__count">
              {scatterPoints.length.toLocaleString()} LSOAs
            </span>
          </div>
          <CrimeTypeScatter
            points={scatterPoints}
            selectedCode={selectedLsoa?.code}
            highlightedCodes={highlightedCodes}
            activeBin={activeBin}
            onSelect={handleScatterSelect}
            height={240}
          />
        </section>

        <div className="fmap-divider" />

        {/* Correlation diverging chart */}
        <p className="fmap-panel__kicker">Structural correlates (Spearman ρ)</p>
        <p className="fmap-panel__desc" style={{ fontSize: '0.72rem' }}>
          <span style={{ color: '#9b3ea8', fontWeight: 700 }}>Purple → violent</span>
          {' · '}
          <span style={{ color: '#1d7db5', fontWeight: 700 }}>Blue → property</span>
        </p>
        <CorrelationDivergingChart correlations={correlations} width={340} />

        <div className="fmap-divider" />

        {/* Selected LSOA */}
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
                <span>Quadrant</span>
                <strong style={{ color: getCrimeTypeBin(selectedLsoa) != null
                  ? CRIME_TYPE_PALETTE[getCrimeTypeBin(selectedLsoa)!]
                  : undefined }}>
                  {getCrimeTypeBin(selectedLsoa) != null
                    ? CRIME_TYPE_LABELS[getCrimeTypeBin(selectedLsoa)!]
                    : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#9b3ea8' }}>Violent rate</span>
                <strong>{fmtRate(selectedLsoa.violentRate)}</strong>
              </div>
              <div>
                <span style={{ color: '#1d7db5' }}>Property rate</span>
                <strong>{fmtRate(selectedLsoa.propertyRate)}</strong>
              </div>
              <div>
                <span>Property share</span>
                <strong>
                  {(() => {
                    const s = getPropertyShare(selectedLsoa);
                    return s != null ? `${s.toFixed(1)}%` : '—';
                  })()}
                </strong>
              </div>
              <div>
                <span style={{ color: '#b565b0' }}>Deprivation sub-index</span>
                <strong>
                  {typeof selectedLsoa.deprivationSubIndex === 'number'
                    ? `${selectedLsoa.deprivationSubIndex.toFixed(1)} / 100` : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#3ea8d8' }}>Mobility sub-index</span>
                <strong>
                  {typeof selectedLsoa.mobilitySubIndex === 'number'
                    ? `${selectedLsoa.mobilitySubIndex.toFixed(1)} / 100` : '—'}
                </strong>
              </div>
              <div>
                <span>Overall crime rate</span>
                <strong>{formatRate(selectedLsoa.crimeRate)}</strong>
              </div>
            </div>
          </>
        ) : (
          <p className="fmap-panel__desc" style={{ fontSize: '0.78rem' }}>
            Click any LSOA on the map or dot on the scatter to see its crime composition
            and structural profile.
          </p>
        )}

        <div className="fmap-takeaway">
          <strong>Key insight</strong> — deprivation and unemployment load far more on violent
          crime; private renting and recent migration flip to property crime. Off-diagonal areas
          in the structural analysis section are often property-crime hotspots with low structural deprivation.
        </div>
      </aside>
    </div>
  );
};

export default CrimeTypeDivergencePage;
