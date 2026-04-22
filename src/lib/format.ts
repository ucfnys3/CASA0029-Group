export const formatInteger = (value: number | null | undefined) =>
  value == null ? 'No data' : Math.round(value).toLocaleString();

export const formatDecimal = (value: number | null | undefined, digits = 1) =>
  value == null ? 'No data' : value.toFixed(digits);

export const formatPercent = (value: number | null | undefined, digits = 1) =>
  value == null ? 'No data' : `${value.toFixed(digits)}%`;

export const formatRate = (value: number | null | undefined) =>
  value == null ? 'No data' : `${value.toFixed(1)} per 1,000`;

export const formatDensity = (value: number | null | undefined) =>
  value == null ? 'No data' : `${Math.round(value).toLocaleString()} per sq km`;

export const formatCompact = (value: number | null | undefined) => {
  if (value == null) {
    return 'No data';
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}m`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }

  return `${Math.round(value)}`;
};

export const labelize = (value: string) =>
  value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
