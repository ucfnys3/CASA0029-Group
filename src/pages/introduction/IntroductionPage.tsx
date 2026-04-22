import {
  BoroughChangeChart,
  GovLineChartCard,
  PoliceStrengthChart,
} from '../../components/GovStyleCharts';
import StoryCard from '../../components/StoryCard';
import Takeaway from '../../components/Takeaway';
import { useJsonData } from '../../hooks/useJsonData';
import type { BackgroundChartsData } from '../../types/data';

const responseSources = [
  {
    label: 'Mayor of London: Police and Crime Plan 2025-2029',
    href:
      'https://www.london.gov.uk/programmes-strategies/mayors-office-policing-and-crime-mopac/mayors-police-and-crime-plan-2025-2029',
  },
  {
    label: 'London Assembly: response to the draft Police and Crime Plan',
    href:
      'https://www.london.gov.uk/who-we-are/what-london-assembly-does/london-assembly-work/london-assembly-publications/response-mayors-draft-police-and-crime-plan-2025-29',
  },
  {
    label: 'ONS: Crime in England and Wales, year ending March 2025',
    href:
      'https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/bulletins/crimeinenglandandwales/yearendingmarch2025',
  },
];

const theorySources = [
  {
    title: 'Social disorganisation theory',
    text:
      'Neighbourhood crime is shaped by local capacity for informal social control. Concentrated disadvantage, residential instability, and weak community networks can make it harder for places to collectively manage risk.',
    source: 'Sampson and Groves, 1989; Shaw and McKay tradition',
    href:
      'https://nij.ojp.gov/library/publications/community-structure-and-crime-testing-social-disorganization-theory',
  },
  {
    title: 'Routine activity theory',
    text:
      'Crime opportunities rise where motivated offenders, suitable targets, and limited guardianship converge. This helps explain why central activity zones and transport corridors can show intense recorded crime even when resident deprivation is not the only driver.',
    source: 'Cohen and Felson, 1979',
    href: 'https://ojp.gov/ncjrs/virtual-library/abstracts/social-change-and-crime-rate-trends-routine-activity-approach',
  },
  {
    title: 'Structural vulnerability',
    text:
      'The project treats unemployment, deprivation, housing pressure, overcrowding, health, and population density as contextual conditions. They do not prove individual causation, but they help explain why risk is spatially uneven.',
    source: 'Project structural indicators, 2021 LSOA analysis',
    href: '#/mapping-vulnerability',
  },
];

const IntroductionPage = () => {
  const { data: charts, loading, error } =
    useJsonData<BackgroundChartsData>('/data/backgroundCharts.json');

  if (loading) {
    return <div className="shell-width page-shell">Loading introduction...</div>;
  }

  if (!charts || error) {
    return (
      <div className="shell-width page-shell">
        Could not load the introduction charts. {error}
      </div>
    );
  }

  return (
    <div className="shell-width page-shell introduction-page">
      <section className="intro-page-heading">
        <p className="intro-page-heading__label">Page 2 / Introduction and background</p>
        <h1>Why London’s crime problem persists</h1>
        <p>
          This page sets up the atlas question. London is not short of policy attention,
          policing reform, or public concern. Yet recorded crime, uneven borough-level change,
          and falling confidence point to a deeper spatial problem: safety is produced through
          neighbourhood conditions as well as enforcement.
        </p>
      </section>

      <section className="intro-narrative-row intro-narrative-row--problem">
        <div className="intro-narrative-copy">
          <span>01 / The pressure</span>
          <h2>Recorded crime remains a visible city-wide concern.</h2>
          <p>
            The project data show recent recorded crime moving unevenly across time and boroughs.
            This does not mean every Londoner experiences risk in the same way. It means that
            city-level headlines need to be broken down geographically before they can explain
            where public safety pressure is accumulating.
          </p>
          <p>
            The first two charts use the project’s borough-series data. They frame the problem
            before the site moves into interactive maps.
          </p>
        </div>
        <div className="intro-chart-pair">
          <GovLineChartCard
            title="Recorded crime trend"
            legend="Total offences"
            data={charts.recordedCrime}
            yLabel="Number"
          />
          <BoroughChangeChart data={charts.boroughChange} />
        </div>
      </section>

      <section className="intro-narrative-row intro-narrative-row--response">
        <div className="intro-chart-pair">
          <GovLineChartCard
            title="Confidence in the police"
            legend="Public confidence"
            data={charts.policeConfidence}
            yLabel="Percent"
            valueFormatter={(value) => `${Math.round(value)}%`}
          />
          <PoliceStrengthChart data={charts.policeForceStrength} />
        </div>
        <div className="intro-narrative-copy">
          <span>02 / The response</span>
          <h2>More policy effort does not automatically resolve the pattern.</h2>
          <p>
            London’s current policing agenda emphasises prevention, partnership work, confidence,
            neighbourhood policing, and harm reduction. Those are substantial interventions, but
            the public-confidence data remind us that institutional response and public legitimacy
            do not move in a simple straight line.
          </p>
          <p>
            This is why the site avoids treating crime only as a policing output. The maps ask
            what kinds of places repeatedly sit closer to recorded risk, and what structural
            conditions those places share.
          </p>
          <div className="intro-source-list" aria-label="Background sources">
            {responseSources.map((source) => (
              <a href={source.href} target="_blank" rel="noreferrer" key={source.href}>
                {source.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="intro-theory-section">
        <div className="intro-theory-section__header">
          <span>03 / From enforcement to explanation</span>
          <h2>The atlas turns from incidents to neighbourhood vulnerability.</h2>
          <p>
            Criminological theory helps explain why the rest of the project maps deprivation,
            housing pressure, health, youth concentration, overcrowding, and labour-market
            insecurity alongside crime. These theories are lenses for interpretation, not claims
            that poverty or identity mechanically causes crime.
          </p>
        </div>
        <div className="intro-theory-grid">
          {theorySources.map((item) => (
            <article className="intro-theory-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <a href={item.href} target={item.href.startsWith('#') ? undefined : '_blank'} rel="noreferrer">
                {item.source}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="story-grid">
        <StoryCard
          href="/borough-crime-situation"
          title="Borough crime situation"
          description="Move from the background problem into borough-level rates, totals, categories, and monthly shifts."
        />
        <StoryCard
          href="/mapping-vulnerability"
          title="Mapping vulnerability"
          description="Switch from policing headlines to neighbourhood conditions at LSOA scale."
        />
        <StoryCard
          href="/crime-and-inequality"
          title="Crime and inequality together"
          description="Compare where recorded crime and structural vulnerability overlap most clearly."
        />
      </section>

      <Takeaway
        title="The bridge into the maps"
        text="The following pages do not ask whether policing matters; they ask why crime is spatially concentrated and why some neighbourhoods carry overlapping social and economic vulnerability. That distinction keeps the analysis structural rather than stigmatising."
      />
    </div>
  );
};

export default IntroductionPage;
