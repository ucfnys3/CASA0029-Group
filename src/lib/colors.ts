export const PALETTES = {
  crime: ['#fff0e6', '#f8c7a8', '#ef8f61', '#ca5535', '#7c1d13'],
  vulnerability: ['#f5efff', '#dbc1dc', '#bf7f98', '#933b65', '#551d3d'],
  overlap: ['#fff4df', '#f4cd8a', '#df8f54', '#b15140', '#632537'],
  priority: ['#fff3db', '#f0bc74', '#d66b3d', '#99363b', '#521d30'],
  density: ['#fdecd7', '#f8bf7a', '#f08f46', '#cb5635', '#851f1c'],
} as const;

export type PaletteName = keyof typeof PALETTES;
