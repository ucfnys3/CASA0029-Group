# What To Check Before Final Submission

## Unresolved Schema Assumptions

- `london_crimes_2025_flexible.json` and the Q4 2025 geocoded point files do not represent exactly the same count logic, so borough overview totals and hotspot-page totals are not identical.
- `182` LSOAs do not currently have a complete set of structural indicators for the final comparative index, so they appear as no-data in some synthesis views.
- The priority index uses equal weights and robust min-max scaling. Confirm that the team is happy with this transparent prototype method.

## Content Assumptions

- The Introduction page uses official/local sources for public confidence, national crime context, and social disorganisation theory.
- The site does not state that London is definitively one of Europe's "top 15 most dangerous cities" because the sources found for that type of ranking are not strong enough for an academic/public-facing prototype.
- The Home page uses a custom SVG impression image rather than a downloaded crime photograph, so there is no external image licensing dependency.

## Page Structure Checks

- Confirm the new 8-page order:
  Home, Introduction, Borough Crime Situation, Recent Incidents and Hotspots, Mapping Vulnerability, Crime and Inequality Together, Priority Places, About.
- Confirm whether the team wants the old `/crime-overview` fallback route to remain.
- Confirm whether the page names in the navigation are final.

## Pages Still Using Placeholder Content

- `About / Methodology / Team` still contains placeholder team contribution text.
- `About / Methodology / Team` still contains a placeholder AI-use statement.

## Manual Visual Checks

- Open Home and check that the full-screen cover image, title, and buttons look balanced on desktop and mobile.
- Open Introduction and check whether the background/theory cards have enough detail for the group narrative.
- Open Borough Crime Situation and test the vertical scroll selectors for metric and month.
- Open Recent Incidents and test the vertical scroll selectors for month and crime type.
- Check map legends and captions on smaller screens.

## Data Checks

- Spot-check a few borough monthly values against `Final_Borough_Map.geojson`.
- Spot-check a few LSOA indicator values against the raw Census CSVs.
- Confirm that selected hotspot samples match the current month and crime-type filters.
- Confirm that the index ranking still looks sensible after any future variable changes.

## Deployment Checks

- Run `npm run prepare-data` if raw data or preprocessing code changes.
- Run `npm run build` before upload.
- Open the built `dist/index.html` through a static server or GitHub Pages preview.
- Confirm that `dist/data`, `dist/assets`, and `dist/favicon.svg` are included in the final upload.

## Location Checks

- Main working copy:
  `F:\UCL\0029group_test\final_prototype_website`
- Secondary testing/share copy:
  `F:\UCL\0029group_website_test`
- Keep both locations synchronized if the team uses both.
