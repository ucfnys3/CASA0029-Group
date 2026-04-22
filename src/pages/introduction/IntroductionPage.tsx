import StoryCard from '../../components/StoryCard';
import Takeaway from '../../components/Takeaway';
import { useJsonData } from '../../hooks/useJsonData';
import { formatCompact, formatInteger, formatPercent, formatRate } from '../../lib/format';
import type { SummaryData } from '../../types/data';

const evidenceCards = [
  {
    title: 'Crime is a city problem, not only a police problem',
    text:
      'London policy documents increasingly frame safety through partnership work, prevention, public health, and the complex causes of crime. That framing fits this atlas: the maps ask where risk accumulates, not just where offences are recorded.',
    source: 'London Police and Crime Plan 2025-2029',
    href:
      'https://www.london.gov.uk/programmes-strategies/mayors-office-policing-and-crime-mopac/mayors-police-and-crime-plan-2025-2029',
  },
  {
    title: 'Trust and confidence are part of the background',
    text:
      'The London Assembly noted that recorded crime volumes had risen year-on-year since 2021-22 and that confidence in the Met and victim satisfaction had fallen. Public safety is therefore also a question of legitimacy and lived confidence.',
    source: 'London Assembly Police and Crime Committee, 2025',
    href:
      'https://www.london.gov.uk/who-we-are/what-london-assembly-does/london-assembly-work/london-assembly-publications/response-mayors-draft-police-and-crime-plan-2025-29',
  },
  {
    title: 'The wider national picture is mixed',
    text:
      'ONS estimates for England and Wales show a recent rise in headline CSEW crime, driven strongly by fraud, while some high-harm recorded offences moved differently. This is why the atlas separates crime type, time frame, and geography.',
    source: 'ONS Crime in England and Wales, YE March 2025',
    href:
      'https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/bulletins/crimeinenglandandwales/yearendingmarch2025',
  },
  {
    title: 'Social disorganisation theory gives a useful lens',
    text:
      'Classic neighbourhood theory links crime variation to area-level conditions such as low economic status, residential mobility, weak local networks, and limited informal social control. We use this carefully as context, not as proof of causation.',
    source: 'Sampson and Groves, 1989; building on Shaw and McKay',
    href:
      'https://nij.ojp.gov/library/publications/community-structure-and-crime-testing-social-disorganization-theory',
  },
];

const IntroductionPage = () => {
  const { data: summary, loading, error } = useJsonData<SummaryData>('/data/summary.json');

  if (loading) {
    return <div className="shell-width page-shell">Loading introduction...</div>;
  }

  if (!summary || error) {
    return <div className="shell-width page-shell">Could not load the introduction. {error}</div>;
  }

  const q4TopBorough = summary.overview.topBoroughsByQ4Rate[0] ?? null;
  const topCategory = summary.overview.topCategoriesQ4[0] ?? null;

  return (
    <div className="shell-width page-shell introduction-page">
      <section className="chapter-hero">
        <div className="chapter-hero__brief">
          <p className="chapter-hero__label">Page 2 / Introduction and background</p>
          <h1>Before the maps: why crime concentration matters</h1>
          <p>
            London is often discussed through headlines: dangerous streets, falling confidence,
            visible theft, knife crime, or policing reform. This project slows that story down and
            asks a spatial question: where do crime and structural vulnerability overlap?
          </p>
          <p>
            We do not treat league-table claims such as "most dangerous city" rankings as evidence
            unless the source and method are robust. Instead, the atlas uses official and project
            datasets to show unevenness inside London.
          </p>
        </div>

        <div className="chapter-hero__stats intro-stat-strip">
          <article className="intro-stat">
            <span>Q4 2025 geocoded incidents</span>
            <strong>{formatCompact(summary.home.q4IncidentCount)}</strong>
            <p>Street-level records for September to December 2025.</p>
          </article>
          <article className="intro-stat">
            <span>Q4 borough-series offences</span>
            <strong>{formatCompact(summary.overview.overviewCards.q4Offences)}</strong>
            <p>Aggregated borough-level offences in the 2025 series.</p>
          </article>
          <article className="intro-stat">
            <span>Top LSOA decile share</span>
            <strong>{formatPercent(summary.home.topDecileCrimeShare)}</strong>
            <p>Share of 2021 crimes in the highest-rate LSOA decile.</p>
          </article>
          <article className="intro-stat">
            <span>Neighbourhoods mapped</span>
            <strong>{formatInteger(summary.home.lsoaCount)}</strong>
            <p>{summary.home.completeStructuralCount.toLocaleString()} LSOAs have complete indicators.</p>
          </article>
        </div>
      </section>

      <section className="background-layout">
        <aside className="background-portrait panel-card">
          <span className="background-portrait__tag">Brief</span>
          <h2>Crime concentration is not random noise.</h2>
          <p>
            A small number of places carry a much larger share of recorded crime. Central activity
            zones, transport corridors, nightlife economies, housing instability, deprivation, and
            labour-market insecurity can all shape where risk becomes visible.
          </p>
          <div className="background-portrait__divider" />
          <p>
            {q4TopBorough && topCategory
              ? `In the 2025 borough series, ${q4TopBorough.name} records the highest Q4 rate at ${formatRate(
                  q4TopBorough.q4Rate,
                )}. The largest Q4 category is ${topCategory.name.toLowerCase()}, with ${formatCompact(
                  topCategory.count,
                )} recorded offences.`
              : 'The borough and category summaries load from the project data rather than a static report extract.'}
          </p>
        </aside>

        <div className="evidence-stack">
          <h2>How this project frames the problem</h2>
          {evidenceCards.map((card) => (
            <article className="evidence-card" key={card.title}>
              <div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </div>
              <a href={card.href} target="_blank" rel="noreferrer">
                {card.source}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="story-grid">
        <StoryCard
          href="/borough-crime-situation"
          title="Borough crime situation"
          description="Move from background into the first analytical map: borough-level rates, totals, categories, and monthly shifts."
        />
        <StoryCard
          href="/recent-incidents"
          title="Recent incidents and hotspots"
          description="Explore where Q4 2025 geocoded incident records cluster, with month and crime-type controls."
        />
        <StoryCard
          href="/mapping-vulnerability"
          title="Mapping vulnerability"
          description="Switch to 2021 neighbourhood variables that describe structural pressure at LSOA scale."
        />
      </section>

      <Takeaway
        title="What to keep in mind"
        text="The website separates the structural 2021 neighbourhood analysis from the Q4 2025 incident layer. They support one narrative about spatial inequality, but they should not be interpreted as the same evidence type."
      />
    </div>
  );
};

export default IntroductionPage;
