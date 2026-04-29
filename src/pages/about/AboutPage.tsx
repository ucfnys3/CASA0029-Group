import PageHero from '../../components/PageHero';

const AboutPage = () => {
  return (
    <div className="shell-width page-shell">
      <PageHero
        eyebrow="About the Project"
        title="London Crime Inequality Atlas"
        description="A LSOA-level spatial atlas exploring how recorded crime, structural neighbourhood pressure, crime-type mechanisms, and model sensitivity intersect across London."
      />

      <section className="panel-grid">
        <article className="panel-card">
          <p className="panel-card__eyebrow">Research Background and Aims</p>
          <h3>Why a neighbourhood-level atlas is needed</h3>
          <p>
            Criminal spatial inequality in London is often described at ward or borough level, but
            those scales can hide the finer relationship between community vulnerability and
            recorded crime (Zhou, Wang and Zhou, 2023). This project therefore works mainly at
            Lower Layer Super Output Area (LSOA) level, where neighbourhood contrasts can be read
            with greater spatial precision.
          </p>
          <p>
            Drawing on social disorganisation theory, routine activity theory, and Sharma's account
            of social disorder, the atlas asks two questions. Do crime hotspots overlap with areas
            of high structural pressure? Where they do not overlap, what does the mismatch suggest
            about exposure, mobility, local protection, or crime-type mechanism?
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Project Logic</p>
          <h3>A diagnostic atlas, not a single-cause explanation</h3>
          <p>
            The atlas does not argue that poverty directly causes crime. It treats recorded crime
            concentration as an observed spatial pattern that must be compared with structural
            pressure, mobility, routine activity, and local context. This distinction matters
            because high-crime places may reflect footfall, retail exposure, nightlife, transport
            nodes, or reporting practices as well as residential disadvantage.
          </p>
          <p>
            The analysis is staged: first map the crime baseline, then build a crime-free
            structural pressure surface, compare both through a crime x pressure matrix, separate
            violent and property-oriented crime mechanisms, and finally use scenario sensitivity to
            ask where fitted crime rates respond most strongly to selected structural indicators.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Data Sources</p>
          <h3>Open datasets with distinct analytical roles</h3>
          <p>
            Metropolitan Police crime incident data for Q4 2025 provides the point-level crime
            baseline used in the borough and 3D hotspot views. Each incident includes a location,
            crime category, and LSOA code. LSOA-level crime-rate data is also used for the
            structural comparison, crime-type analysis, and model sensitivity sections.
          </p>
          <p>
            Socio-economic indicators come from the 2021 England and Wales Census via Nomis and
            the Office for National Statistics. LSOA and London Borough boundary files come from
            the ONS Open Geography Portal. Public perception of neighbourhood safety and Police
            Force Strength datasets are used as wider interpretive context rather than as inputs to
            the structural pressure score.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Processing and Indicators</p>
          <h3>Structural pressure is built before it is compared with crime</h3>
          <p>
            Data preprocessing is handled by a lightweight Python pipeline,
            <code> prepare_data.py</code>, invoked with <code>npm run prepare-data</code>. Crime
            incidents are linked to LSOAs through the LSOA code already stored in their attributes,
            avoiding unnecessary geometric point-in-polygon processing. Census tables are then
            joined to LSOA boundaries through shared geographic identifiers.
          </p>
          <p>
            The structural pressure score combines six normalised indicators: unemployment,
            private renting, household deprivation, no qualifications, recent migration, and the
            share of residents aged 20-24. Each variable is robust-scaled to a 0-100 range using
            the 5th and 95th percentiles, limiting the influence of outliers while preserving
            variation across typical London LSOAs.
          </p>
          <p>
            Crime rates are expressed per 1,000 residents. For the matrix analysis, crime-rate
            scores and pressure scores are split into tertiles and cross-tabulated. OLS
            coefficients exported from the preprocessing workflow support the scenario simulation,
            where selected structural indicators are hypothetically reduced.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Visualisation Methods</p>
          <h3>Linked maps, 3D aggregation, matrix cells, and scatter views</h3>
          <p>
            The 3D crime view uses deck.gl's <strong> HexagonLayer</strong> on a MapLibre basemap
            through react-map-gl, representing incident density as extruded hexagonal columns.
            Users can filter by crime type and month, adjust elevation, and inspect tooltips for
            incident counts and dominant categories.
          </p>
          <p>
            The LSOA-level maps use choropleth and bivariate classifications to display crime
            rates, individual socio-economic indicators, composite pressure scores, and crime x
            pressure cells. Search, hover, click selection, local profile panels, and scatter plots
            keep spatial patterns connected to statistical interpretation.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Analytical Interpretation</p>
          <h3>Where theory holds, bends, or needs another mechanism</h3>
          <p>
            High-crime and high-pressure LSOAs give the strongest evidence of overlapping
            disadvantage. High-crime and low-pressure places challenge a deprivation-only reading
            and may point toward exposure, retail activity, transport flows, nightlife, or
            property-crime opportunity. High-pressure and low-crime places suggest local
            protection, community context, or measurement factors not captured by the indicators.
          </p>
          <p>
            The crime-type and scenario sections refine this interpretation. Violent and
            property-oriented crimes are treated as potentially different mechanisms rather than
            one general crime pattern. The scenario simulation is then used as a sensitivity test,
            not as a causal policy forecast.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Application Features</p>
          <h3>Interactive exploration without losing the research argument</h3>
          <p>
            The application lets users move between the observed crime baseline, structural
            pressure surface, structural matrix, crime-type mechanism page, scenario simulation,
            and final summary. Search functions on the LSOA-level pages allow users to locate a
            borough, LSOA code, or named area and inspect how it behaves across linked map and
            statistical views.
          </p>
          <p>
            The final summary page synthesises the analysis rather than adding another layer. It
            shows that crime is spatially concentrated, structural pressure forms a different but
            related geography, the matrix reveals both alignment and mismatch, and scenario
            sensitivity varies across neighbourhoods.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Limitations</p>
          <h3>The atlas is exploratory, contextual, and correlation-based</h3>
          <p>
            Recorded crime is shaped by reporting behaviour, police recording practices, land use,
            commuter flows, visitor populations, nightlife, retail activity, and other exposure
            patterns that are not fully captured by Census indicators. A high pressure score does
            not mean residents cause crime, and a low pressure score does not imply the absence of
            crime risk.
          </p>
          <p>
            The scenario simulation holds other variables constant and asks how fitted values
            change under hypothetical reductions in selected indicators. Its value is diagnostic:
            it highlights places and mechanisms for further investigation rather than producing a
            definitive intervention ranking.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Use of AI Tools</p>
          <h3>Development support with research decisions retained by the team</h3>
          <p>
            Claude and other AI tools were used as development aids for debugging, clarifying
            unfamiliar React, Leaflet, deck.gl, and MapLibre patterns, resolving runtime errors,
            supporting interface iteration, and refining written explanation.
          </p>
          <p>
            Decisions about the research framework, data selection, metric construction,
            analytical interpretation, and visual design were made by the project team.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Teams</p>
          <h3>Project team</h3>
          <p>Fangzheng Zhou, Jianshu Wu, Jie Jiang, Yucan Shen.</p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Reference List</p>
          <h3>Sources cited in the atlas</h3>
          <p>
            Greater London Authority (2026) <em>Police Force Strength</em>. London Datastore.
            Available at: https://data.london.gov.uk/dataset/police-force-strength-e7xoj/
            (Accessed: 18 April 2026).
          </p>
          <p>
            Mayor's Office for Policing and Crime (MOPAC) (2025)
            <em> Public Perceptions of the Police</em>. Greater London Authority. Available at:
            https://data.london.gov.uk/dataset/public-perceptions-of-the-police-2lz3x/
            (Accessed: 18 April 2026).
          </p>
          <p>
            Metropolitan Police Service (2024) <em>Crime Data</em>. Available at:
            https://data.police.uk/ (Accessed: 15 April 2026).
          </p>
          <p>
            Office for National Statistics (2021) <em>Census 2021</em>. Available at:
            https://www.ons.gov.uk/census (Accessed: 15 April 2026).
          </p>
          <p>
            Zhou, Y., Wang, F. and Zhou, S. (2023) 'The Spatial Patterns of the Crime Rate in
            London and Its Socio-Economic Influence Factors', <em>Social Sciences</em>, 12(6),
            p. 340. doi: 10.3390/socsci12060340.
          </p>
        </article>
      </section>
    </div>
  );
};

export default AboutPage;
