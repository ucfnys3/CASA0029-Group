export type RadarAxis = {
  key: string;
  label: string;
  shortLabel?: string;
};

type RadarChartProps = {
  axes: RadarAxis[];
  values: Record<string, number | null | undefined>;
  baseline?: Record<string, number | null | undefined>;
  size?: number;
  maxValue?: number;
  ariaLabel?: string;
  useShortLabels?: boolean;
};

const RadarChart = ({
  axes,
  values,
  baseline,
  size = 260,
  maxValue = 100,
  ariaLabel = 'Vulnerability profile radar',
  useShortLabels = false,
}: RadarChartProps) => {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 36;
  const n = axes.length;

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const pointFor = (i: number, value: number) => {
    const angle = angleFor(i);
    const r = (Math.max(0, Math.min(maxValue, value)) / maxValue) * radius;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
  };

  const axisEnd = (i: number) => pointFor(i, maxValue);

  const selectedScores = axes.map((axis) => values[axis.key]);
  const hasAllSelected = selectedScores.every(
    (v) => typeof v === 'number' && !Number.isNaN(v),
  );
  const hasAnyBaseline =
    baseline && axes.every((axis) => typeof baseline[axis.key] === 'number');

  const buildPolygon = (scores: Array<number | null | undefined>) =>
    scores
      .map((value, i) => {
        const v = typeof value === 'number' ? value : 0;
        const [x, y] = pointFor(i, v);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');

  const gridRings = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <svg
      className="fmap-radar__svg"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={ariaLabel}
      width="100%"
      height="auto"
    >
      <title>{ariaLabel}</title>

      {gridRings.map((r) => (
        <polygon
          key={r}
          className="fmap-radar__grid"
          points={axes
            .map((_, i) => {
              const [x, y] = pointFor(i, maxValue * r);
              return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(' ')}
        />
      ))}

      {axes.map((_, i) => {
        const [x, y] = axisEnd(i);
        return (
          <line
            key={`axis-${i}`}
            className="fmap-radar__axis"
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
          />
        );
      })}

      {hasAnyBaseline ? (
        <polygon
          className="fmap-radar__baseline"
          points={buildPolygon(axes.map((axis) => baseline![axis.key] as number))}
        />
      ) : null}

      {hasAllSelected ? (
        <>
          <polygon
            className="fmap-radar__polygon"
            points={buildPolygon(selectedScores)}
          />
          {selectedScores.map((value, i) => {
            const [x, y] = pointFor(i, value as number);
            return (
              <circle
                key={`dot-${i}`}
                className="fmap-radar__dot"
                cx={x}
                cy={y}
                r={2.8}
              />
            );
          })}
        </>
      ) : null}

      {axes.map((axis, i) => {
        const labelR = radius + 18;
        const angle = angleFor(i);
        const x = cx + Math.cos(angle) * labelR;
        const y = cy + Math.sin(angle) * labelR;
        const textAnchor =
          Math.abs(Math.cos(angle)) < 0.2
            ? 'middle'
            : Math.cos(angle) > 0
              ? 'start'
              : 'end';
        return (
          <text
            key={`label-${i}`}
            className="fmap-radar__label"
            x={x}
            y={y}
            textAnchor={textAnchor}
            dominantBaseline="middle"
          >
            {useShortLabels && axis.shortLabel ? axis.shortLabel : axis.label}
          </text>
        );
      })}

      {!hasAllSelected ? (
        <text
          className="fmap-radar__empty"
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          Insufficient data
        </text>
      ) : null}
    </svg>
  );
};

export default RadarChart;
