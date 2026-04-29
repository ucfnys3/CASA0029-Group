export const PALETTES = {
  crime: ['#fff0e6', '#f8c7a8', '#ef8f61', '#ca5535', '#7c1d13'],
  vulnerability: ['#f5efff', '#dbc1dc', '#bf7f98', '#933b65', '#551d3d'],
  overlap: ['#fff4df', '#f4cd8a', '#df8f54', '#b15140', '#632537'],
  priority: ['#fff3db', '#f0bc74', '#d66b3d', '#99363b', '#521d30'],
  density: ['#fdecd7', '#f8bf7a', '#f08f46', '#cb5635', '#851f1c'],
  violent:  ['#f5f0ff', '#d4aadd', '#b565b0', '#882b7e', '#530048'],
  property: ['#e8f6ff', '#9ed4f0', '#3ea8d8', '#1168a0', '#053060'],
} as const;

export type PaletteName = keyof typeof PALETTES;

// Joshua Stevens bivariate 3x3 palette (purple x orange).
// Index = crimeBin * 3 + vulnBin, where 0=low, 1=mid, 2=high for each axis.
// Reading:
//   bin 0 (low-low) = pale neutral
//   bin 2 (low crime, high vuln)   = warm orange (pressure without crime)
//   bin 6 (high crime, low vuln)   = cool purple (crime without pressure)
//   bin 8 (high-high)              = deep focal colour (double high)
// Crime-type quadrant palette (2×2: violent × property, each low/high)
// bin = (violentRateScore > 50 ? 2 : 0) + (propertyRateScore > 50 ? 1 : 0)
// 0 = low-low  1 = low-violent high-property  2 = high-violent low-property  3 = both-high
// bin = highCrime * 2 + highProperty
// 0: low crime, violence-led  → muted purple
// 1: low crime, property-led  → muted blue
// 2: high crime, violence-led → deep purple
// 3: high crime, property-led → deep blue
export const CRIME_TYPE_PALETTE = ['#c4a8d4', '#8ec6e6', '#7b2d8b', '#1168a0'] as const;
export const CRIME_TYPE_LABELS  = [
  'Low crime · violence-led',
  'Low crime · property-led',
  'High crime · violence-led',
  'High crime · property-led',
] as const;

export const BIVARIATE_PALETTE = [
  '#e8e8e8', '#e4acac', '#c85a5a',
  '#b0d5df', '#ad9ea5', '#985356',
  '#64acbe', '#627f8c', '#574249',
] as const;

export const BIVARIATE_NO_DATA = '#f2f2f2';

// Archetype palette for focal-zone typology. Non-focal LSOAs stay grey.
export type ArchetypeKey = 'economic' | 'housing_mobility' | 'youth' | 'mixed';

export const ARCHETYPE_META: Record<
  ArchetypeKey,
  { label: string; shortLabel: string; color: string; indicators: string[]; framing: string }
> = {
  economic: {
    label: 'Economic disorganisation',
    shortLabel: 'Economic',
    color: '#d97757',
    indicators: ['unemployment', 'deprivation', 'noQualifications'],
    framing:
      'Places where labour-market exclusion, household deprivation, and low qualifications anchor the pressure profile. Policy lever: employment + skills support.',
  },
  housing_mobility: {
    label: 'Housing & mobility',
    shortLabel: 'Housing/Mobility',
    color: '#7b4ed9',
    indicators: ['privateRenting', 'recentMigration'],
    framing:
      'Places defined by private renting and recent residential turnover. Policy lever: housing security + neighbourhood integration.',
  },
  youth: {
    label: 'Young adult transition pressure',
    shortLabel: '20-24',
    color: '#2f8f6d',
    indicators: ['youthShare'],
    framing:
      'Places where residents aged 20-24 dominate the pressure profile. Policy lever: young adult services, transition support, and public-space safety.',
  },
  mixed: {
    label: 'Mixed pressure',
    shortLabel: 'Mixed',
    color: '#c9a64a',
    indicators: [],
    framing:
      'Places where two or more pressure families co-lead with no single dominant axis. Policy lever: integrated place-based strategies.',
  },
};

export const ARCHETYPE_NON_FOCAL = 'rgba(255, 246, 232, 0.08)';
export const FOCAL_HIGHLIGHT = '#c04433';
