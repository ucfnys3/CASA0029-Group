const overviewFigures = [
  {
    label: 'Crime Map',
    src: '/images/summary/crime-map.png',
  },
  {
    label: '3D Crime Analysis',
    src: '/images/summary/3d-analysis.png',
  },
  {
    label: 'Structural Pressure',
    src: '/images/summary/vulnerability.png',
  },
  {
    label: 'Crime x Pressure Matrix',
    src: '/images/summary/structural-analysis.png',
  },
] as const;

const mechanismFigures = [
  {
    label: 'Crime-Type Mechanisms',
    src: '/images/summary/crime-types.png',
  },
  {
    label: 'Scenario Simulation',
    src: '/images/summary/scenario.png',
  },
] as const;

const findings = [
  {
    title: 'Crime is spatially concentrated, but concentration alone is not the explanation.',
    body:
      'The crime map and 3D view show offences clustering around central activity corridors and selected outer-London hotspots. These patterns are important starting evidence, but they also reflect exposure, footfall, retail activity, transport nodes, and nightlife intensity rather than deprivation alone.',
  },
  {
    title: 'Structural pressure forms a separate neighbourhood geography.',
    body:
      'The vulnerability analysis builds a composite pressure surface from 2021 Census indicators including unemployment, private renting, household deprivation, no qualifications, recent migration, and the 20-24 age share. This produces a social geography that is related to, but clearly not identical with, the observed crime surface.',
  },
  {
    title: 'The structural analysis matrix identifies where the theory holds and where it bends.',
    body:
      'Cross-tabulating crime and pressure tertiles places every LSOA into a 3x3 matrix of alignment, mismatch, or resilience. The high-crime and high-pressure cell gives the clearest evidence of overlapping disadvantage, while the off-diagonal cells show where the explanation needs more local mechanism.',
  },
  {
    title: 'Violent and property-oriented crimes appear to follow different structural mechanisms.',
    body:
      'The crime-type analysis tests whether one broad crime rate hides different relationships. Violent crime is read more directly through deprivation and exclusion pressures, while property-oriented crime is interpreted alongside private renting, recent migration, mobility, and target-rich activity areas.',
  },
  {
    title: 'Scenario sensitivity shows where structural change may matter most.',
    body:
      'The simulation does not claim to forecast exact policy outcomes. Instead, it holds other variables constant and asks which LSOAs would be most sensitive to hypothetical reductions in selected structural pressures, turning the model into a spatial prioritisation tool for further investigation.',
  },
] as const;

const AnalysisSummaryPage = () => {
  return (
    <div className="summ-page shell-width">
      <section className="summ-report" aria-labelledby="analysis-summary-title">
        <div className="summ-left" aria-label="Visual summary of analysis pages">
          <div className="summ-figure-grid">
            {overviewFigures.map((figure) => (
              <figure className="summ-figure summ-figure--small" key={figure.label}>
                <img src={figure.src} alt={figure.label} />
                <figcaption>{figure.label}</figcaption>
              </figure>
            ))}
          </div>

          {mechanismFigures.map((figure) => (
            <figure className="summ-figure summ-figure--wide" key={figure.label}>
              <img src={figure.src} alt={figure.label} />
              <figcaption>{figure.label}</figcaption>
            </figure>
          ))}
        </div>

        <div className="summ-right">
          <p className="summ-eyebrow">Analysis Summary</p>
          <h1 className="summ-title" id="analysis-summary-title">
            What the atlas shows
          </h1>

          <div className="summ-findings">
            {findings.map((finding, index) => (
              <article className="summ-finding" key={finding.title}>
                <span className="summ-finding__num">{index + 1}.</span>
                <div className="summ-finding__body">
                  <h2>{finding.title}</h2>
                  <p>{finding.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="summ-conclusion">
          In conclusion, London crime inequality is best understood as an interaction between
          recorded offence concentration, structural neighbourhood pressure, crime-type mechanism,
          and model sensitivity. The atlas identifies where the structural explanation is strong,
          where it bends, and where further place-based investigation is needed.
        </div>
      </section>
    </div>
  );
};

export default AnalysisSummaryPage;
