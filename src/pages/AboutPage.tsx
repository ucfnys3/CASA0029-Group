import PageHero from '../components/PageHero';

const AboutPage = () => {
  return (
    <div className="shell-width page-shell">
      <PageHero
        eyebrow="About"
        title="About, methodology, and team"
        description="A transparent account of the research logic, data roles, indicator design, analytical workflow, and interpretation limits behind the atlas."
      />

      <section className="panel-grid">
        <article className="panel-card">
          <p className="panel-card__eyebrow">Research Logic</p>
          <h3>A diagnostic atlas, not a single-cause explanation</h3>
          <p>
            The London Crime Inequality Atlas examines how recorded crime and neighbourhood
            conditions vary across the city. Its central claim is not that deprivation directly
            causes crime. Instead, it treats crime concentration as a spatial pattern that needs
            to be compared with structural pressure, mobility, exposure, and local context.
          </p>
          <p>
            The analysis therefore moves from observation to explanation. It first establishes
            where offences concentrate, then constructs a crime-free structural pressure surface,
            then tests where those two surfaces align or diverge. Later sections use crime-type
            mechanisms and model sensitivity to interpret the places where a simple deprivation
            narrative is not enough.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Data Roles</p>
          <h3>Different datasets answer different parts of the question</h3>
          <p>
            The crime context section uses a current Metropolitan Police incident extract to
            show recent borough-level patterns and 3D hotspot concentration. This part of the
            atlas is descriptive: it helps viewers see where offences are currently clustering
            before any structural interpretation is added.
          </p>
          <p>
            The structural pressure and structural analysis sections use LSOA-level crime rates
            alongside 2021 Census indicators. The Census variables are used because the project
            needs stable neighbourhood context: unemployment, private renting, household
            deprivation, low qualifications, recent migration, age 20-24, population density,
            and total resident population.
          </p>
          <p>
            Boundary data comes from 2021 Lower Layer Super Output Area geography and London
            Borough boundaries. Background charts also draw on public confidence and police
            strength datasets, but these are used to frame the wider policy problem rather than
            to calculate the neighbourhood pressure score.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Indicator Design</p>
          <h3>Structural pressure is built before crime is compared</h3>
          <p>
            The structural pressure score is intentionally separated from crime. It averages six
            robust-scaled Census indicators: unemployment, private renting, household
            deprivation, no qualifications, recent migration, and age 20-24 share. Population
            density and crime rate are retained as contextual variables but are not included in
            the composite pressure score.
          </p>
          <p>
            Each indicator is rescaled to a 0-100 range using a robust min-max approach based on
            the 5th and 95th percentiles. This keeps extreme outliers from dominating the map
            colours and makes the indicators comparable enough to combine in a single pressure
            surface.
          </p>
          <p>
            Crime rates are expressed per 1,000 residents. In the structural analysis section,
            crime-rate scores and pressure scores are split into tertiles and cross-tabulated.
            This design turns the map into a matrix: high-high areas support the structural
            pressure argument, while off-diagonal areas reveal where other mechanisms are needed.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Analytical Workflow</p>
          <h3>From observed pattern to mechanism and sensitivity</h3>
          <p>
            The crime context section provides the observational baseline. The structural
            pressure section then removes crime from the frame and asks where social and economic
            pressures cluster. The structural analysis section puts the two surfaces together
            through a bivariate matrix and scatter view.
          </p>
          <p>
            The crime-type mechanism section asks whether different crime categories follow
            different logics. This helps interpret places where high crime appears without high
            structural pressure, or where high pressure does not translate into high recorded
            crime. The scenario simulation section then uses an OLS model as a sensitivity tool,
            asking how fitted predictions respond when selected pressures are hypothetically
            reduced.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Implementation</p>
          <h3>Interactive maps with a lightweight processing pipeline</h3>
          <p>
            Data preprocessing is handled by a custom Python pipeline invoked with{' '}
            <code>npm run prepare-data</code>. The pipeline joins tabular indicators to LSOA and
            borough boundaries through shared geographic identifiers, exports runtime GeoJSON and
            JSON files, and prepares summary statistics for the React interface.
          </p>
          <p>
            The frontend is built with React and TypeScript. Choropleth and bivariate maps use
            Leaflet-based components, while the 3D hotspot view uses deck.gl's
            <strong> HexagonLayer</strong> with a MapLibre basemap. Search, hover, click, scatter,
            legend, and slider interactions are designed to keep the analytical map linked to
            local place details.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Interpretation Limits</p>
          <h3>Correlation, exposure, and measurement uncertainty</h3>
          <p>
            The atlas should be read as exploratory spatial analysis. Recorded crime is shaped
            by reporting practices, police recording, land use, commuter flows, nightlife,
            retail density, and other exposure patterns that are not fully captured by Census
            indicators. A low structural pressure score does not mean an area has no crime risk;
            a high pressure score does not imply residents are responsible for crime.
          </p>
          <p>
            The scenario simulation is also not a policy forecast. It uses observed associations
            in the fitted model to show sensitivity, not the causal effect of changing one
            variable in the real world. The purpose is to reveal which places and levers deserve
            closer investigation, not to produce a definitive intervention ranking.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Use of AI Tools</p>
          <h3>Development support, with research decisions retained by the team</h3>
          <p>
            AI tools were used as development support for debugging, code explanation, interface
            iteration, and wording refinement. They helped identify runtime errors, clarify React
            and mapping-library patterns, and improve the consistency of written interpretation.
            Research framing, data selection, indicator construction, and final design decisions
            remained the responsibility of the project team.
          </p>
        </article>
        <article className="panel-card">
          <p className="panel-card__eyebrow">Teams</p>
          <h3>Project team</h3>
          <p>Fangzheng Zhou, Jianshu Wu, Jie Jiang, Yucan Shen</p>
        </article>
      </section>
    </div>
  );
};

export default AboutPage;
