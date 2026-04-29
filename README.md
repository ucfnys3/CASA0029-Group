# London Crime Inequality Atlas

CASA0029 Group19 project: an interactive LSOA-level atlas exploring how recorded
crime, structural neighbourhood pressure, crime-type mechanisms, and model
sensitivity intersect across London.

## Project Structure

The application is a static React/Vite site. It has no live backend at runtime:
all analysis data is prepared in advance and served from `public/data/`.

```text
final_prototype_website/
  data/                  raw source data and supplementary data scripts
    *.py                 crime-type patch and model-building scripts
    generated/           intermediate outputs (crime_types.json, research_stats.json)
  public/
    assets/              cover assets
    data/                generated runtime JSON and GeoJSON files
    images/              introduction and summary images
  scripts/
    prepare_data.py      main preprocessing pipeline
  src/
    app/                 App shell and routing (App.tsx)
    components/          reusable UI, map, and chart components
    hooks/               data-fetching hook (useJsonData.ts)
    lib/                 shared utilities (colors, format, stats, hotspots, basePath)
    pages/               one subdirectory per route
    styles/              global dark theme CSS
    types/               shared TypeScript interfaces (data.ts)
  package.json           npm scripts and frontend dependencies
  README.md              project metadata and reproducibility notes
```

## Current Page Flow

1. `Home` - cover page and project entry point
2. `Introduction` - research context, public confidence, theory, and navigation
3. `Crime Map` - borough summary, LSOA lookup, and 3D crime hotspot view
4. `Vulnerability` - LSOA structural pressure surface and local profile view
5. `Structural Analysis` - crime x pressure matrix, map, and scatter plot
6. `Crime Types` - violent/property-oriented crime mechanism comparison
7. `Scenario Simulation` - OLS-based sensitivity maps and readout
8. `Summary` - synthesis of the full analytical workflow
9. `About` - research background, data, methods, limitations, and references

Legacy routes `/borough-crime-situation`, `/crime-overview`, `/recent-incidents`,
and `/priority-places` redirect to the current main pages via `<Navigate>` in App.tsx.

## Data Architecture

The project uses three data layers:

- `data/`: raw and intermediate source files required for reproducibility.
- `scripts/` and `data/*.py`: preprocessing and patch scripts that generate runtime data.
- `public/data/`: final runtime data fetched by the browser.

The frontend reads runtime files through `useJsonData()` in `src/hooks/useJsonData.ts`.
The hook applies the Vite base path through `src/lib/basePath.ts`, so the same code can
run locally or under a GitHub Pages subpath.

## Runtime Data Files

The current site reads these files from `public/data/`:

| File | Used by |
|------|---------|
| `summary.json` | Crime Map (borough stats, hotspot meta) |
| `boroughs.geojson` | Crime Map (choropleth) |
| `lsoa.geojson` | Vulnerability, Structural Analysis, Crime Types, Scenario Simulation |
| `lsoaLookup.json` | Crime Map 3D hotspot (LSOA name/borough decode) |
| `backgroundCharts.json` | Introduction (recorded crime, police confidence charts) |
| `model_coefficients.json` | Scenario Simulation (OLS coefficients) |
| `crime_correlations.json` | Crime Types (diverging correlation chart) |
| `crime_type_models.json` | Crime Types + Scenario Simulation (sub-model coefficients) |
| `incidents/2025-09.json` | Crime Map 3D (September incidents) |
| `incidents/2025-10.json` | Crime Map 3D (October incidents) |
| `incidents/2025-11.json` | Crime Map 3D (November incidents) |
| `incidents/2025-12.json` | Crime Map 3D (December incidents) |
| `incidents/2025-Q4.json` | Crime Map 3D (full Q4 aggregate) |

Reproducibility outputs not served to the browser:

- `data/generated/research_stats.json` — summary statistics written by `prepare_data.py`
- `data/generated/crime_types.json` — intermediate output written by `build_crime_types.py`

## Reproducible Data Preparation

### Python dependencies

`prepare_data.py` requires `numpy`. Install before running the pipeline:

```bash
pip install numpy
```

All other pipeline scripts use only the Python standard library.

### Node dependencies

```bash
npm install
```

### A note on data scope

The exploratory phase of this project drew on a considerably wider set of Census 2021
tables and administrative datasets, including country of birth, general health, religion,
sex, disability status, household overcrowding, occupancy ratings, PTAL accessibility
scores, workplace population, and job density at LSOA level. These were examined as
candidate structural pressure indicators and as potential confounders for the crime–
pressure relationship.

Following the exploratory analysis, the indicator set was deliberately narrowed. Variables
were retained only where they contributed meaningfully to the composite pressure score or
the OLS model, and where their inclusion could be theoretically justified within the social
disorganisation and routine activity frameworks. Variables that were highly collinear,
analytically redundant, or outside the theoretical scope of the project were excluded from
the final pipeline. The repository therefore contains only the files that the production
pipeline actively reads; the broader exploratory dataset is not committed because it is not
needed to reproduce the published outputs.

### Raw data files required by the pipeline

The following files in `data/` must be present for the pipeline to run.
They are all committed to the repository except where noted.

**Stage 1 — `scripts/prepare_data.py`**

| File | Note |
|------|------|
| `London_LSOA_2021_Boundaries.geojson` | 2021 LSOA boundary (London subset, 2.8 MB) |
| `Final_Borough_Map.geojson` | London borough boundaries |
| `LSOA_Crime_Rate_2021_With_Names.csv` | LSOA-level 2021 crime rates |
| `Economic activity status lsoa.csv` | Census 2021 unemployment |
| `Tenure and house situation lsoa.csv` | Census 2021 private renting |
| `Households by deprivation dimensions lsoa.csv` | Census 2021 deprivation |
| `Highest level of qualification lsoa.csv` | Census 2021 qualifications |
| `Migrant Indicator lsoa.csv` | Census 2021 recent migration |
| `Age by broad age bands lsoa .csv` | Census 2021 age 20-24 share |
| `Population density lsoa.csv` | Census 2021 population density |
| `total residents lsoa.csv` | Census 2021 total residents |
| `public-perception-data.csv` | MOPAC public confidence survey |
| `Police_Force_Strength.csv` | GLA police force strength |
| `london_crimes_2025_flexible.json` | Borough-level Q4 2025 crime aggregates |
| `monthly_data_clean（月度犯罪点数据）/London_Crime_2025-{09-12}.geojson` | ⚠️ 127 MB total — point-level incident data |

**Stage 2 — `data/build_crime_types.py`** (runs after Stage 1)

| File | Note |
|------|------|
| `MPS LSOA Level Crime (Historical).csv` | ⚠️ 50 MB — MPS historical category counts by LSOA |
| `public/data/lsoa.geojson` | Generated by Stage 1; must exist first |

### Large file warning

Two raw data files exceed GitHub's recommended 50 MB per-file limit:

- `data/MPS LSOA Level Crime (Historical).csv` (50 MB)
- `data/monthly_data_clean（月度犯罪点数据）/` (127 MB total, four files ~30 MB each)

For GitHub hosting, use **Git LFS** to track these files. For a zip-based submission
they can be included directly as there is no per-file size constraint.

### Running the pipeline

Generate the main runtime data:

```bash
npm run prepare-data
```

Generate crime-type overlays and models (requires Stage 1 to have run first):

```bash
npm run prepare-crime-types
```

Run the full pipeline in one step:

```bash
npm run prepare-all-data
```

The pipeline reads raw source files from `data/` and writes all browser-ready outputs
to `public/data/`. Run order within Stage 2 is fixed:
`build_crime_types.py` → `patch_geojson_crime_types.py` → `patch_subindices.py` → `build_crime_type_models.py`.

### Summary page screenshots

The six screenshots in `public/images/summary/` are manually captured from the running
app and are committed to the repository. They are not generated by any script.

## Local Development

```bash
npm run dev
```

The development server is normally available at:

```text
http://127.0.0.1:5173/#/
```

## Production Build

```bash
npm run build
```

The production bundle is written to `dist/`.

If the site is deployed under a repository subpath, set `VITE_BASE_PATH` before building.
The app uses `HashRouter`, so static hosting does not need server-side route handling.

## Deployment Package

### Online deployment (static hosting)

Publish the `dist/` folder only. No server-side routing is needed because the app uses
`HashRouter`. All runtime data is already inside `dist/data/` after the build.

### Reproducible coursework submission

Include the following so the marker can regenerate all data and rebuild from source:

| Include | Why |
|---------|-----|
| `src/` | All React, TypeScript, and CSS source |
| `public/` | Static assets, pre-built runtime data, and committed screenshots |
| `data/` | All raw source CSVs/GeoJSONs and Python patch scripts |
| `scripts/prepare_data.py` | Main preprocessing pipeline |
| `package.json`, `package-lock.json` | Node dependencies |
| `index.html`, `vite.config.ts` | Vite entry and config |
| `tsconfig.json`, `tsconfig.node.json` | TypeScript config |
| `postcss.config.cjs` | PostCSS config |
| `README.md` | This file |

**Include `dist/`** when the submission needs a ready-to-open static build (marker does
not need to run the build step). Omit it if the marker will build from source.

**Omit always:**
- `node_modules/` — reinstall with `npm install`
- `.git/` — version-control metadata
- `.claude/` — local assistant metadata

Every file currently committed to `data/` is read by the pipeline.
Exploratory datasets that were not used have been removed from the repository.

### Data file locations

All browser-fetched files live exclusively in `public/data/`. The Python pipeline writes
to this directory; no runtime data is split across other folders.

Intermediate and reproducibility-only outputs go to `data/generated/` and are **not**
served to the browser.

## Module Inventory

### Pages (`src/pages/`)

| Route | Page file | Function |
|-------|-----------|----------|
| `/` | `home/HomePage.tsx` | Cover page and entry point |
| `/introduction` | `introduction/IntroductionPage.tsx` | Problem context, theory cards, background charts |
| `/crime-map` | `crime-map-dashboard/CrimeMapDashboard.tsx` | Borough choropleth + 3D deck.gl hotspot view |
| `/mapping-vulnerability` | `mapping-vulnerability/MappingVulnerabilityPage.tsx` | LSOA pressure surface, indicator switcher, local profile |
| `/crime-and-inequality` | `crime-inequality/CrimeInequalityPage.tsx` | Bivariate crime × pressure matrix and scatter |
| `/crime-type-divergence` | `crime-type-divergence/CrimeTypeDivergencePage.tsx` | Violent vs property quadrant map and correlations |
| `/scenario-simulation` | `priority-places/PriorityPlacesPage.tsx` | OLS slider comparison maps and model readout |
| `/analysis-summary` | `analysis-summary/AnalysisSummaryPage.tsx` | Static synthesis with screenshot figures |
| `/about` | `about/AboutPage.tsx` | Methods, data, limitations, references |

### Analysis components (`src/components/`)

| Component | Category | Purpose |
|-----------|----------|---------|
| `ChoroplethMap.tsx` | Map / visualisation | Leaflet LSOA choropleth with hover, click, legend |
| `BivariateChoroplethMap.tsx` | Map / visualisation | 3×3 bivariate crime × pressure Leaflet map |
| `CrimeDeckMap.tsx` | Map / visualisation | deck.gl HexagonLayer 3D incident density on MapLibre |
| `SliderCompareMap.tsx` | Map / visualisation | Side-by-side Leaflet map with drag divider |
| `CrimeTypeQuadrantMap.tsx` | Map / visualisation | 2×2 violent/property quadrant choropleth |
| `BivariateScatter.tsx` | Chart / visualisation | SVG scatter of crime score vs pressure score |
| `CrimeTypeScatter.tsx` | Chart / visualisation | SVG scatter of violent vs property rate |
| `CorrelationDivergingChart.tsx` | Chart / visualisation | Horizontal diverging bar chart for correlations |
| `RadarChart.tsx` | Chart / visualisation | SVG radar showing six structural dimensions |
| `LineChart.tsx` | Chart / visualisation | SVG line chart (background charts in Introduction) |
| `GovStyleCharts.tsx` | Chart / visualisation | Composite chart cards for Introduction page |
| `GeoSearch.tsx` | Interface / UI | Typeahead search for LSOA/borough lookup |
| `BivariateLegend.tsx` | Interface / UI | 3×3 clickable bivariate legend |
| `CrimeTypeLegend.tsx` | Interface / UI | 2×2 clickable crime-type legend |
| `MapLegend.tsx` | Interface / UI | Colour-swatch map legend |
| `PageHero.tsx` | Interface / UI | Page header block (About page) |
| `StatCard.tsx` | Interface / UI | Stat highlight card |
| `StoryCard.tsx` | Interface / UI | Image + text theory/problem card |
| `Takeaway.tsx` | Interface / UI | Highlighted takeaway block |

### Shared libraries (`src/lib/`)

| File | Purpose |
|------|---------|
| `colors.ts` | All colour palettes (crime, vulnerability, bivariate, crime-type) |
| `format.ts` | Number formatters (rate, percent, density, compact) |
| `stats.ts` | Quantile, palette-binning, radius-scaling utilities |
| `hotspots.ts` | Incident decoding, cell aggregation for the 3D map |
| `basePath.ts` | Vite base-path helper for GitHub Pages subpath deployment |

### Data hooks (`src/hooks/`)

`useJsonData.ts` — fetches any JSON/GeoJSON from `public/data/`, applies the base path,
and returns `{ data, loading, error }`. All pages use this hook for their data calls.

## Interpretation Notes

The atlas is exploratory and correlation-based. Recorded crime is shaped by reporting,
recording, land use, mobility, nightlife, retail exposure, and resident population
measurement. The structural pressure score is not a claim that residents cause crime.
The scenario simulation is a sensitivity exercise, not a causal policy forecast.
