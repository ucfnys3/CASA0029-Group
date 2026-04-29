/**
 * AnalysisSummaryPage
 * -------------------
 * Layout: left column = stacked thumbnail groups, right column = numbered findings
 * Bottom: full-width conclusion banner
 *
 * Images: drop screenshots into public/images/summary/ with the filenames below.
 * Until then, each slot shows a themed CSS-gradient placeholder.
 */

const THUMBS = [
  {
    label: 'Crime Map',
    src: '/images/summary/crime-map.jpg',
    tone: 'crime',
  },
  {
    label: 'Vulnerability',
    src: '/images/summary/vulnerability.jpg',
    tone: 'pressure',
  },
  {
    label: 'Structural Analysis',
    src: '/images/summary/structural-analysis.jpg',
    tone: 'matrix',
  },
  {
    label: 'Crime Types',
    src: '/images/summary/crime-types.jpg',
    tone: 'crime-type',
  },
  {
    label: 'Scenario Simulation',
    src: '/images/summary/scenario.jpg',
    tone: 'scenario',
  },
  {
    label: 'Introduction',
    src: '/images/summary/introduction.jpg',
    tone: 'intro',
  },
] as const;

const LARGE_FIGS = [
  {
    label: 'Bivariate matrix · crime × pressure',
    caption: 'Each LSOA placed in one of nine cells by crime tertile and pressure tertile',
    src: '/images/summary/bivariate-detail.jpg',
    tone: 'matrix',
  },
  {
    label: 'Scenario simulation · before vs after',
    caption: 'Left map: predicted crime rate · Right map: implied reduction per LSOA',
    src: '/images/summary/scenario-detail.jpg',
    tone: 'scenario',
  },
] as const;

const FINDINGS = [
  {
    num: '01',
    heading: 'Crime is spatially concentrated — but concentration alone explains nothing',
    body: 'Offences cluster strongly in central activity corridors and specific outer-London hotspots. Central areas stand out partly because resident population undercounts footfall, retail exposure, and nightlife intensity. The observed crime map is therefore the starting point of the analysis, not its explanation.',
  },
  {
    num: '02',
    heading: 'Structural pressure forms its own neighbourhood geography',
    body: 'The vulnerability section deliberately removes crime from the calculation, building a composite pressure surface from six 2021 Census indicators: unemployment, private renting, household deprivation, no qualifications, recent migration, and young-adult share. The resulting surface is geographically distinct from the crime map — a necessary precondition for testing whether they align.',
  },
  {
    num: '03',
    heading: 'The bivariate matrix confirms the theory — and reveals where it bends',
    body: 'Cross-tabulating crime and pressure tertiles shows that the high-high double-disadvantage cluster accounts for around 18% of London LSOAs. Equally important are the off-diagonal zones: high-crime / low-pressure areas challenge the deprivation narrative; high-pressure / low-crime areas point toward local protective factors that structural indicators cannot yet capture.',
  },
  {
    num: '04',
    heading: 'Violent and property crime follow different structural logics',
    body: 'Separate OLS models for violent and property crime rates confirm the mechanism split established in Page 5\'s correlation analysis: unemployment and deprivation load more heavily on violent crime (β_violent ≈ 1.1–1.5), while private renting and recent migration load more on property crime (β_property ≈ 0.9–1.5). This means off-diagonal high-crime / low-deprivation areas are predominantly property-crime hotspots driven by mobility rather than economic exclusion.',
  },
  {
    num: '05',
    heading: 'Scenario sensitivity shows where structural change matters most',
    body: 'Holding other variables constant and hypothetically reducing deprivation, private renting, or recent migration reveals which LSOAs would respond most strongly to structural improvement. Reductions translate unequally across the city: places where the chosen indicator is already highest show the largest implied drop, making the simulation a spatial prioritisation tool rather than a literal policy forecast.',
  },
] as const;

const AnalysisSummaryPage = () => {
  return (
    <div className="summ-page shell-width">

      {/* ── Main card ── */}
      <div className="summ-card">

        {/* Left column — thumbnails */}
        <div className="summ-left">

          {/* 3×2 small thumbnail grid */}
          <div className="summ-thumb-grid">
            {THUMBS.map((t) => (
              <div key={t.label} className={`summ-thumb summ-thumb--${t.tone}`}>
                <img
                  src={t.src}
                  alt={t.label}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="summ-thumb__label">{t.label}</span>
              </div>
            ))}
          </div>

          {/* 2 larger detail figures */}
          <div className="summ-large-grid">
            {LARGE_FIGS.map((f) => (
              <div key={f.label} className={`summ-large summ-large--${f.tone}`}>
                <img
                  src={f.src}
                  alt={f.label}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="summ-large__caption">
                  <strong>{f.label}</strong>
                  <span>{f.caption}</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right column — findings */}
        <div className="summ-right">
          <p className="summ-eyebrow">Analysis Summary</p>
          <h1 className="summ-title">What the atlas shows</h1>

          <div className="summ-findings">
            {FINDINGS.map((f) => (
              <div key={f.num} className="summ-finding">
                <span className="summ-finding__num">{f.num}</span>
                <div className="summ-finding__body">
                  <h2>{f.heading}</h2>
                  <p>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Conclusion banner ── */}
      <div className="summ-conclusion">
        London crime inequality is best understood as an interaction between observed offence
        concentration, structural neighbourhood pressure, crime-type mechanism, and model
        sensitivity. The atlas does not reduce crime to deprivation — it identifies where the
        structural explanation is strong, where it bends, and where further place-based
        investigation is warranted.
      </div>

    </div>
  );
};

export default AnalysisSummaryPage;
