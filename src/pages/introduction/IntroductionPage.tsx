import {
  BoroughChangeChart,
  GovLineChartCard,
  PoliceStrengthChart,
} from '../../components/GovStyleCharts';
import StoryCard from '../../components/StoryCard';
import Takeaway from '../../components/Takeaway';
import { useJsonData } from '../../hooks/useJsonData';
import { withBase } from '../../lib/basePath';
import type { BackgroundChartsData } from '../../types/data';

/* ── Static card data ───────────────────────────────────────── */

const problemCards = [
  {
    img: withBase('/images/intro/crime-rising.jpg'),
    alt: 'London street at night',
    stat: 'Top 15',
    statLabel: 'European cities by crime rate',
    title: 'Crime is rising again',
    body:
      'London now ranks among Europe\'s 15 highest-crime cities. Recorded offences have risen for the second consecutive year, reversing progress made during earlier reform periods.',
    source: 'Evening Standard, 2024; Mayor of London data',
  },
  {
    img: withBase('/images/intro/trust-fallen.jpg'),
    alt: 'Londoners and police',
    stat: '45%',
    statLabel: 'public confidence in 2025',
    title: 'Public trust has collapsed',
    body:
      'Just 45% of Londoners say the police are doing a good job, the lowest level recorded in a decade. Falling legitimacy undermines community cooperation, making informal crime prevention harder.',
    source: 'London Datastore, 2025',
  },
  {
    img: withBase('/images/intro/policing-gap.jpg'),
    alt: 'Metropolitan Police patrol',
    stat: 'Gap',
    statLabel: 'More policing, same results',
    title: 'Enforcement alone is not working',
    body:
      'Despite sustained investment in officer numbers and high-visibility enforcement, crime patterns remain stubbornly persistent. The gap between resource and outcome makes a structural reading necessary.',
    source: 'Mayor\'s Police and Crime Plan 2025-29',
  },
];

const theoryCards = [
  {
    img: withBase('/images/intro/social-disorg.jpg'),
    alt: 'London council estate',
    label: 'Theory 01',
    title: 'Social Disorganisation Theory',
    body:
      'Communities with weak social bonds, high residential turnover, and concentrated disadvantage may struggle to regulate themselves collectively. The theory helps explain why neighbourhood context matters.',
    citation: 'Shaw & McKay, 1942; Sampson & Groves, 1989',
    href: 'https://nij.ojp.gov/library/publications/community-structure-and-crime-testing-social-disorganization-theory',
  },
  {
    img: withBase('/images/intro/routine-activity.jpg'),
    alt: 'London tube commuters at night',
    label: 'Theory 02',
    title: 'Routine Activity Theory',
    body:
      'Crime emerges when a motivated offender encounters a suitable target in the absence of capable guardianship. Everyday urban routines such as commuting, commerce, and nightlife shape these convergences.',
    citation: 'Cohen & Felson, 1979',
    href: 'https://ojp.gov/ncjrs/virtual-library/abstracts/social-change-and-crime-rate-trends-routine-activity-approach',
  },
  {
    img: withBase('/images/intro/structural-vuln.jpg'),
    alt: 'London inequality and housing',
    label: 'Our Framework',
    title: 'Structural Pressure Framework',
    body:
      'This atlas treats unemployment, housing insecurity, deprivation, low qualifications, recent residential mobility, and young adult transitions as contextual conditions that may shape crime exposure, not as individual characteristics that determine behaviour.',
    citation: 'Project structural indicators - 2021 LSOA analysis',
    href: '#/mapping-vulnerability',
  },
];

/* ── Simple sparkline SVG ───────────────────────────────────── */

const Sparkline = ({ values }: { values: number[] }) => {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 80;
  const H = 28;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="intro-sparkline"
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/* ── Page component ─────────────────────────────────────────── */

const IntroductionPage = () => {
  const { data: charts } = useJsonData<BackgroundChartsData>('/data/backgroundCharts.json');

  const crimeValues = charts?.recordedCrime.map((d) => d.value) ?? [];
  const confidenceValues = charts?.policeConfidence.map((d) => d.value ?? 0) ?? [];
  const strengthValues = charts?.policeForceStrength.map(
    (d) => d.policeOfficerStrength,
  ) ?? [];

  return (
    <div className="shell-width page-shell introduction-page">

      {/* ── Page header ── */}
      <section className="w-full flex flex-col items-center py-16 px-4">
        <div className="max-w-[40rem] w-full text-center">
          <p className="intro-section-label">
            Introduction & Background
          </p>
          <p className="text-base md:text-lg text-white/70 leading-relaxed mb-6">
            Crime in London is not evenly distributed. Some places show persistent offence
            concentration, while others carry structural pressures that may increase exposure,
            reduce informal control, or shape the kinds of crime that become visible.
          </p>
          <p className="text-base md:text-lg text-white/70 leading-relaxed mb-6">
            The atlas therefore moves in stages. It first maps observed crime patterns, then
            builds a crime-free structural pressure baseline from 2021 Census indicators at LSOA
            level. The later pages compare crime with that baseline, examine where the
            relationship holds or breaks, and use model-based scenario simulation as a
            sensitivity test rather than a causal forecast.
          </p>
        </div>
      </section>

      {/* ── Section A: The Problem — 3 image cards ── */}
      <section className="intro-problem-section">
        <p className="intro-section-label">01 / The Problem</p>
        <div className="intro-problem-grid">
          {problemCards.map((card, i) => (
            <article className="intro-problem-card" key={i}>
              <div className="intro-problem-card__img-wrap">
                <img src={card.img} alt={card.alt} loading="lazy" />
                <div className="intro-problem-card__img-overlay" />
              </div>
              <div className="intro-problem-card__body">
                <div className="intro-problem-card__stat-row">
                  <span className="intro-problem-card__stat">{card.stat}</span>
                  <span className="intro-problem-card__stat-label">{card.statLabel}</span>
                  <Sparkline
                    values={i === 0 ? crimeValues : i === 1 ? confidenceValues : strengthValues}
                  />
                </div>
                <h3 className="intro-problem-card__title">{card.title}</h3>
                <p className="intro-problem-card__desc">{card.body}</p>
                <span className="intro-problem-card__source">{card.source}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Supporting charts ── */}
      {charts && (
        <section className="intro-charts-section">
          <p className="intro-section-label">Evidence from the data</p>
          <div className="intro-chart-pair">
            <GovLineChartCard
              title="Recorded crime trend"
              legend="Total offences"
              data={charts.recordedCrime}
              yLabel="Number"
            />
            <GovLineChartCard
              title="Confidence in the police"
              legend="Public confidence"
              data={charts.policeConfidence}
              yLabel="Percent"
              valueFormatter={(v) => `${Math.round(v)}%`}
              hideFirstYearTick
            />
          </div>
          <div className="intro-chart-pair" style={{ marginTop: '1rem' }}>
            <BoroughChangeChart data={charts.boroughChange} />
            <PoliceStrengthChart data={charts.policeForceStrength} />
          </div>
        </section>
      )}

      {/* ── Bridge quote ── */}
      <div className="intro-bridge-quote">
        <blockquote>
          "If policing has become tougher, why does crime still feel so commonplace?"
        </blockquote>
        <p>
          The answer requires looking beyond enforcement, toward the neighbourhood conditions
          that shape exposure, informal control, mobility, and opportunity.
        </p>
      </div>

      {/* ── Section B: Theoretical Lens — image + text cards ── */}
      <section className="intro-theory-section">
        <div className="intro-theory-section__header">
          <span>02 / Theoretical Lens</span>
          <h2>From incidents to neighbourhood conditions</h2>
          <p>
            Criminological theory helps explain why deprivation, private renting, low
            qualifications, recent migration, age structure, and labour-market insecurity are
            mapped alongside crime in the following pages. These frameworks are interpretive
            lenses, not claims that poverty causes crime.
          </p>
        </div>
        <div className="intro-theory-grid intro-theory-grid--image">
          {theoryCards.map((card) => (
            <article className="intro-theory-card intro-theory-card--image" key={card.title}>
              <div className="intro-theory-card__img-wrap">
                <img src={card.img} alt={card.alt} loading="lazy" />
                <span className="intro-theory-card__label">{card.label}</span>
              </div>
              <div className="intro-theory-card__content">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <a
                  href={card.href}
                  target={card.href.startsWith('#') ? undefined : '_blank'}
                  rel="noreferrer"
                >
                  {card.citation}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Navigation ── */}
      <section className="story-grid">
        <StoryCard
          href="/crime-map"
          title="Crime Map"
          description="The observed crime baseline: where offences concentrate before structural indicators are added."
        />
        <StoryCard
          href="/mapping-vulnerability"
          title="Structural Pressure"
          description="A crime-free structural pressure surface built from Census indicators at neighbourhood scale."
        />
        <StoryCard
          href="/crime-and-inequality"
          title="Structural Analysis"
          description="A matrix view testing where crime and structural pressure align, diverge, or require more explanation."
        />
        <StoryCard
          href="/crime-type-divergence"
          title="Crime Types"
          description="A mechanism layer for asking whether different crime categories follow different structural logics."
        />
        <StoryCard
          href="/scenario-simulation"
          title="Scenario Simulation"
          description="A correlational sensitivity test showing how fitted crime predictions respond to lower pressure levels."
        />
        <StoryCard
          href="/analysis-summary"
          title="Summary"
          description="A final synthesis bringing the crime baseline, structural pressure, crime-type mechanisms, and scenario sensitivity together."
        />
      </section>

      <Takeaway
        title="The bridge into the maps"
        text="The following pages do not ask whether policing matters. They ask how observed crime, structural pressure, crime type, and model sensitivity can be read together without reducing the story to a single cause."
      />
    </div>
  );
};

export default IntroductionPage;
