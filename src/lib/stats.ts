export const quantile = (values: number[], q: number) => {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = position - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
};

export const buildQuantileBreaks = (values: number[], steps = 5) => {
  if (!values.length) {
    return [];
  }

  return Array.from({ length: steps - 1 }, (_, index) =>
    quantile(values, (index + 1) / steps),
  );
};

export const paletteForValue = (
  value: number | null | undefined,
  breaks: number[],
  palette: readonly string[],
) => {
  if (value == null) {
    return '#39414f';
  }

  const slot = breaks.findIndex((limit) => value <= limit);
  return slot === -1 ? palette[palette.length - 1] : palette[slot];
};

export const scaleRadius = (
  value: number,
  maxValue: number,
  minRadius = 7,
  maxRadius = 24,
) => {
  if (maxValue <= 0) {
    return minRadius;
  }

  const normalized = Math.sqrt(value / maxValue);
  return minRadius + normalized * (maxRadius - minRadius);
};
