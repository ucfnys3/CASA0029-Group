type LineChartPoint = {
  key: string;
  label: string;
  value: number;
};

type LineChartProps = {
  title: string;
  points: LineChartPoint[];
  activeKey?: string;
  valueFormatter?: (value: number) => string;
};

const LineChart = ({
  title,
  points,
  activeKey,
  valueFormatter = (value) => Math.round(value).toLocaleString(),
}: LineChartProps) => {
  const width = 640;
  const height = 250;
  const padding = { top: 28, right: 30, bottom: 44, left: 54 };
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  const xFor = (index: number) =>
    padding.left +
    (index / Math.max(1, points.length - 1)) * (width - padding.left - padding.right);
  const yFor = (value: number) =>
    padding.top +
    (1 - (value - min) / range) * (height - padding.top - padding.bottom);
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(point.value)}`)
    .join(' ');
  const area = `${path} L ${xFor(points.length - 1)} ${height - padding.bottom} L ${padding.left} ${
    height - padding.bottom
  } Z`;

  return (
    <article className="line-chart-card">
      <div className="line-chart-card__header">
        <h3>{title}</h3>
        <span>{valueFormatter(max)} peak</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <defs>
          <linearGradient id="line-chart-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e77745" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#e77745" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((tick) => {
          const y = padding.top + tick * (height - padding.top - padding.bottom);
          return (
            <line
              key={tick}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              className="line-chart-card__grid"
            />
          );
        })}
        <path d={area} className="line-chart-card__area" />
        <path d={path} className="line-chart-card__line" />
        {points.map((point, index) => {
          const active = activeKey === point.key;
          return (
            <g key={point.key}>
              <circle
                cx={xFor(index)}
                cy={yFor(point.value)}
                r={active ? 6 : 4}
                className={active ? 'line-chart-card__dot active' : 'line-chart-card__dot'}
              />
              <text
                x={xFor(index)}
                y={height - 18}
                className={active ? 'line-chart-card__label active' : 'line-chart-card__label'}
                textAnchor="middle"
              >
                {point.label.split(' ')[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </article>
  );
};

export default LineChart;
