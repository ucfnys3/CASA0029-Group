export const PALETTES = {
  crime: ['#fff0e6', '#f8c7a8', '#ef8f61', '#ca5535', '#7c1d13'],
  vulnerability: ['#f5efff', '#dbc1dc', '#bf7f98', '#933b65', '#551d3d'],
  overlap: ['#fff4df', '#f4cd8a', '#df8f54', '#b15140', '#632537'],
  priority: ['#fff3db', '#f0bc74', '#d66b3d', '#99363b', '#521d30'],
  density: ['#fdecd7', '#f8bf7a', '#f08f46', '#cb5635', '#851f1c'],
} as const;

export type PaletteName = keyof typeof PALETTES;

// Joshua Stevens bivariate 3x3 palette (purple x orange).
// Index = crimeBin * 3 + vulnBin, where 0=low, 1=mid, 2=high for each axis.
// Reading:
//   bin 0 (low-low) = pale neutral
//   bin 2 (low crime, high vuln)   = warm orange (pressure without crime)
//   bin 6 (high crime, low vuln)   = cool purple (crime without pressure)
//   bin 8 (high-high)              = deep focal colour (double high)
export const BIVARIATE_PALETTE = [
  '#e8e8e8', '#e4acac', '#c85a5a',
  '#b0d5df', '#ad9ea5', '#985356',
  '#64acbe', '#627f8c', '#574249',
] as const;

export const BIVARIATE_NO_DATA = '#f2f2f2';

// Archetype palette for P6 (focal-zone typology). Non-focal LSOAs stay grey.
export type ArchetypeKey = 'economic' | 'housing_youth' | 'health' | 'mixed';

export const ARCHETYPE_META: Record<
  ArchetypeKey,
  { label: string; shortLabel: string; color: string; indicators: string[]; framing: string }
> = {
  economic: {
    label: 'Economic disorganisation',
    shortLabel: 'Economic',
    color: '#d97757',
    indicators: ['unemployment', 'deprivation'],
    framing:
      'Places where labour-market exclusion and household deprivation anchor the pressure profile. Policy lever: employment + income support.',
  },
  housing_youth: {
    label: 'Housing & youth churn',
    shortLabel: 'Housing/Youth',
    color: '#7b4ed9',
    indicators: ['privateRenting', 'overcrowding', 'youthShare'],
    framing:
      'Places defined by unstable tenure, crowded homes, and a young resident base. Policy lever: housing security + youth services.',
  },
  health: {
    label: 'Health disadvantage',
    shortLabel: 'Health',
    color: '#2f8f6d',
    indicators: ['badHealth'],
    framing:
      'Places where self-reported bad health dominates the profile, often layered on older demographics. Policy lever: community health + social care.',
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
