# London Crime Inequality Atlas

A multi-page static prototype website for a CASA0029 group project about crime concentration, inequality, neighbourhood vulnerability, and urban risk in London.

## Current Concept

The prototype is now structured as a narrative-first, map-led atlas. The first page is a visual title cover; the second page introduces the London crime context, public confidence issue, and neighbourhood theory; the analytical maps then unfold page by page.

The core framing is:

- crime is spatially uneven
- crime is linked to broader social and economic vulnerability
- crime should not be presented only as a policing issue
- recent incident geography and structural neighbourhood analysis should be kept analytically distinct
- city ranking claims are treated cautiously unless the source and method are robust

## Page Structure

1. `Home`
2. `Introduction / Background`
3. `Borough Crime Situation`
4. `Recent Incidents and Hotspots`
5. `Mapping Vulnerability`
6. `Crime and Inequality Together`
7. `Priority Places`
8. `About / Methodology / Team`

The source pages are organised through route folders under `src/pages/`, including:

- `home/`
- `introduction/`
- `borough-crime-situation/`
- `recent-incidents/`
- `mapping-vulnerability/`
- `crime-inequality/`
- `priority-places/`
- `about/`

## Recent Design Changes

- The Home page has been redesigned as a full-screen visual cover with a custom SVG impression image.
- The original overview statistics and framing have moved into the new Introduction / Background page.
- The borough crime map has moved to Page 3.
- The recent incidents and hotspot page has moved to Page 4.
- The borough and hotspot map controls now use compact vertical scroll selectors instead of wide control bars.
- The route `/crime-overview` is still supported as a fallback route to the borough crime page.

## How Previous Materials Informed The Site

This site is a fresh build. It does not directly merge or copy the older sites.

- `Scrollable Sections.html` was used as a narrative and visual pacing reference only.
- The previous borough dashboard informed macro overview logic, summary cards, rankings, and month/category filtering.
- The previous interactive crime map informed hotspot interaction ideas.
- The QM article and appendix informed the variables, limitations, and structural framing.
- The project brief informed the final page logic and public-facing narrative.

## Real Data Files Used

The preprocessing script uses real files from:

```text
data/
```

The project is now self-contained: the raw source files live inside this project folder at `data/`, while the website reads processed runtime files from `public/data/`.

Core inputs include:

- `London_LSOA_2021_Boundaries.geojson`
- `LSOA_Crime_Rate_2021_With_Names.csv`
- `Final_Borough_Map.geojson`
- `london_crimes_2025_flexible.json`
- `Police_Force_Strength.csv`
- `public-perception-data.csv`
- Q4 2025 monthly crime point GeoJSON files
- Census-derived LSOA CSV files for unemployment, tenure, deprivation, qualifications, recent migration, age, population density, and total residents

## Generated Runtime Assets

Running `npm run prepare-data` writes processed files into `public/data/`.

Key runtime outputs:

- `public/data/boroughs.geojson`
- `public/data/lsoa.geojson`
- `public/data/lsoaLookup.json`
- `public/data/summary.json`
- `public/data/backgroundCharts.json`
- `public/data/incidents/2025-Q4.json`
- `public/data/incidents/2025-09.json`
- `public/data/incidents/2025-10.json`
- `public/data/incidents/2025-11.json`
- `public/data/incidents/2025-12.json`

## Tech Stack

- React
- Vite
- TypeScript
- React Router
- Leaflet / React Leaflet

## Local Run

From this folder:

```bash
npm install
npm run prepare-data
npm run dev
```

By default, `npm run prepare-data` reads raw inputs from this folder:

```text
F:\UCL\0029group_test\final_prototype_website\data
```

If you need to temporarily read source data from another folder, set the path first:

```bash
set CASA0029_SOURCE_DIR=F:\some\other\data-folder
npm run prepare-data
```

## Production Build

```bash
npm run build
```

The production bundle is created in `dist/`.

## Local Test Of Built Site

```bash
cd F:\UCL\0029group_test\final_prototype_website\dist
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## GitHub Pages Deployment

This project uses `HashRouter`, so it is suitable for static hosting without a backend.

Typical deployment flow:

1. Run `npm run prepare-data`
2. Run `npm run build`
3. Publish the contents of `dist/` to GitHub Pages

If the repository uses a subpath, set `VITE_BASE_PATH` before building.

## Notes On Interpretation

- The structural analysis pages use 2021 LSOA boundaries and 2021 neighbourhood indicators.
- The hotspot page uses Q4 2025 geocoded incident records.
- Those two evidence layers should not be treated as interchangeable.
- The Crime Vulnerability Index is a comparative summary indicator, not a causal model.
- The Introduction page uses cautious wording for public perception and media ranking claims.
