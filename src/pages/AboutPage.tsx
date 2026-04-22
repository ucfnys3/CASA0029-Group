import PageHero from '../components/PageHero';
import Takeaway from '../components/Takeaway';
import { useJsonData } from '../hooks/useJsonData';
import { formatCompact } from '../lib/format';
import type { SummaryData } from '../types/data';

const AboutPage = () => {
  const { data: summary, loading, error } = useJsonData<SummaryData>('/data/summary.json');

  if (loading) {
    return <div className="shell-width page-shell">Loading project notes...</div>;
  }

  if (!summary || error) {
    return <div className="shell-width page-shell">Could not load the about page. {error}</div>;
  }

  return (
    <div className="shell-width page-shell">
      <PageHero
        eyebrow="Page 8"
        title="About, methodology, and team"
        description="This page keeps the methods readable. It explains what datasets the prototype uses, how the final comparative index is built, and where the main limitations sit."
        note="The website is a prototype for communication and exploration. It is not intended to replace the full written appendix or the original code notebooks."
      />

      <section className="about-grid">
        <article className="panel-card">
          <p className="panel-card__eyebrow">Data layers</p>
          <h3>Two analytical time frames</h3>
          <ul className="text-list">
            <li>
              <strong>2021 structural analysis.</strong> LSOA crime rate plus census-based
              indicators such as unemployment, private renting, deprivation, bad health,
              overcrowding, and youth share.
            </li>
            <li>
              <strong>Q4 2025 incident exploration.</strong> Geocoded street-level incident
              records for September, October, November, and December 2025.
            </li>
            <li>
              <strong>2025 borough overview.</strong> Aggregated borough-level offence and
              positive-outcome series used for the macro entry page.
            </li>
          </ul>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Method</p>
          <h3>How the Crime Vulnerability Index is built</h3>
          <ul className="text-list">
            <li>Indicators are combined at LSOA scale.</li>
            <li>
              The index uses equal weights across crime rate, unemployment, private renting,
              household deprivation, bad health, overcrowding, and youth share.
            </li>
            <li>
              Values are robustly min-max scaled so that extreme outliers do not dominate the
              map.
            </li>
            <li>
              The output is comparative rather than predictive. It highlights places where
              multiple pressures coincide.
            </li>
          </ul>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Key cautions</p>
          <h3>Limits of interpretation</h3>
          <ul className="text-list">
            <li>These maps show area-level relationships, not individual behaviour.</li>
            <li>
              The 2021 structural layer and the 2025 incident layer should not be treated as the
              same evidence type.
            </li>
            <li>Cross-sectional analysis identifies associations, not proof of causality.</li>
            <li>
              Central commercial and visitor-heavy districts can behave as outliers in crime
              datasets.
            </li>
          </ul>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Project status</p>
          <h3>Prototype coverage</h3>
          <div className="metric-list">
            <div>
              <span>LSOAs mapped</span>
              <strong>{formatCompact(summary.home.lsoaCount)}</strong>
            </div>
            <div>
              <span>Complete structural cases</span>
              <strong>{formatCompact(summary.home.completeStructuralCount)}</strong>
            </div>
            <div>
              <span>Q4 geocoded incidents</span>
              <strong>{formatCompact(summary.home.q4IncidentCount)}</strong>
            </div>
            <div>
              <span>Boroughs mapped</span>
              <strong>{summary.overview.overviewCards.boroughsMapped}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="panel-grid">
        <article className="panel-card">
          <p className="panel-card__eyebrow">Team placeholders</p>
          <h3>Fill before final submission</h3>
          <ul className="text-list">
            <li>[Name] - narrative writing, page structure, and editing.</li>
            <li>[Name] - data cleaning, preprocessing, and summary indicators.</li>
            <li>[Name] - mapping, interaction design, and visual polish.</li>
            <li>[Name] - QA, deployment, and final submission packaging.</li>
          </ul>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">AI-use placeholder</p>
          <h3>Fill before final submission</h3>
          <p>
            Add a short statement here describing how AI tools were used for coding support,
            drafting, checking, or editing, along with any human review steps taken before
            submission.
          </p>
        </article>
      </section>

      <section className="panel-card">
        <p className="panel-card__eyebrow">References</p>
        <h3>Main sources to cite</h3>
        <ul className="text-list">
          <li>Office for National Statistics, Census 2021 tables at LSOA scale.</li>
          <li>Metropolitan Police crime data and borough-level crime dashboard exports.</li>
          <li>Greater London Authority and London Datastore context statistics.</li>
          <li>Project documents stored in the group folder, including the brief and appendix.</li>
          <li>London City Hall, Police and Crime Plan 2025-2029.</li>
          <li>Sampson and Groves (1989), social disorganisation theory.</li>
        </ul>
      </section>

      <Takeaway
        title="Before submission"
        text="Use this page to keep the final website transparent. Readers should be able to tell what each dataset does, how the index was constructed, and where the main limitations still sit."
      />
    </div>
  );
};

export default AboutPage;
