import PageHero from '../components/PageHero';

const AboutPage = () => {
  return (
    <div className="shell-width page-shell">
      <PageHero
        eyebrow="Page 7"
        title="About, methodology, and team"
        description="Research design, data sources, processing steps and visualization methods used in the project."
      />

      <section className="panel-grid">
        <article className="panel-card">
          <p className="panel-card__eyebrow">Research Background and Aims</p>
          <h3>Neighbourhood‑scale inquiry into criminal spatial inequality</h3>
          <p>
            Criminal spatial inequality in London is predominantly documented and studied at the
            borough level; however, analyses at this scale often struggle to capture the nuanced
            relationship between neighbourhood‑level vulnerability and criminal inequality. This
            project, utilising LSOA‑level data, seeks to explore this issue in greater depth.
          </p>
          <p>
            Firstly, do crime hotspots spatially overlap with areas of high social vulnerability?
            Secondly, what are the structural differences in the distribution of crime across
            London’s neighbourhoods? To what extent do these differences reflect underlying
            socio‑economic conditions rather than transient factors? These will be the key
            research questions underpinning the entire project.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Datasets</p>
          <h3>Open sources and supplementary surveys</h3>
          <p>
            The project is based on several open datasets. Metropolitan Police crime incident data
            for Q4 2025 (October to December) forms the primary dataset. Monthly GeoJSON files
            were obtained from the UK Police open data platform (data.police.uk), with each
            incident recorded as a point feature carrying a geographic location, crime category,
            and LSOA code. The temporal scope of a single quarter was chosen to examine structural
            spatial patterns while limiting the influence of seasonal variation across an extended
            period.
          </p>
          <p>
            Socioeconomic indicators at LSOA level were sourced from the 2021 England and Wales
            Census via Nomis and the Office for National Statistics. Eight thematic tables were
            used: economic activity status, housing tenure and situation, household deprivation
            dimensions, general health, bedroom occupancy rating, age by broad age bands,
            population density, and total resident population. Administrative boundary files for
            both LSOAs and London Boroughs were obtained from the ONS Open Geography Portal.
          </p>
          <p>
            Two supplementary datasets were incorporated: a public perception of neighbourhood
            safety survey and a Police Force Strength dataset, enabling comparison between
            recorded crime patterns, perceived safety, and policing resource distribution.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Data Processing</p>
          <h3>Lightweight, attribute‑matched pipeline with robust scaling</h3>
          <p>
            Data pre‑processing is primarily handled via a custom Python pipeline (prepare_data.py),
            which is invoked using the command <code>npm run prepare-data</code>. The script
            relies on Python’s standard <code>csv</code> and <code>json</code> modules, as well as
            NumPy, to keep it lightweight.
          </p>
          <p>
            Spatial association between criminal incidents and LSOA boundaries is achieved without
            geometric point‑in‑polygon calculations: each incident record contains an LSOA code
            in its attributes and the pipeline uses that identifier to link incidents to LSOA
            attributes. Aggregation to districts follows the same attribute‑matching approach.
          </p>
          <p>
            Normalisation was applied so indicators on different scales are comparable. Each
            variable was rescaled to a 0–100 range using a robust min‑max method where the
            5th and 95th percentiles define the scaling boundaries rather than observed extremes.
            This percentile‑based rescaling limits the influence of outliers so choropleth
            colours reflect variation across typical LSOAs. Crime rates are expressed per 1,000
            residents, composite vulnerability scores average the normalised dimensions, and a
            bivariate classification cross‑tabulates crime rate tertiles with vulnerability
            tertiles. An OLS regression linking structural indicators to LSOA crime rates is also
            fitted, with exported coefficients supporting a counterfactual simulation feature.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Visualisation Methods</p>
          <h3>Hexagonal aggregation and choropleth comparison</h3>
          <p>
            Visualisation 1 is a 3D hexagonal aggregation layer built using deck.gl’s
            <strong> HexagonLayer</strong> and rendered on a MapLibre basemap via react‑map‑gl.
            The layer represents the density of criminal incidents as extruded hexagonal
            columns; users can filter by crime type and month, adjust elevation scale, and view
            tooltips that display the number of incidents, the main crime categories, and the
            most common administrative districts within each cell.
          </p>
          <p>
            The second visualisation is a choropleth depicting LSOA and district attributes,
            including crime rates, individual socio‑economic indicators, composite vulnerability
            scores, and a bivariate crime‑vulnerability classification. Hover tooltips, click‑to‑
            select interactions and dynamic variable switching enable comparative spatial
            exploration. Statistical summaries and charts are organised alongside maps to support
            interpretation.
          </p>
        </article>

        <article className="panel-card">
          <p className="panel-card__eyebrow">Use of AI Tools</p>
          <h3>Support, debugging and configuration</h3>
          <p>
            Claude (claude.ai, Anthropic) was used as a debugging aid during development. Specific
            uses included clarifying unfamiliar code patterns in the React and deck.gl stacks,
            identifying and resolving runtime errors, and configuring the GitHub Pages deployment
            pipeline. All decisions regarding the research framework, data selection, metric
            construction and visual design were made by the project team.
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
