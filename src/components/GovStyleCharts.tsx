import type {
  BoroughChangePoint,
  ChartPoint,
  PoliceStrengthPoint,
} from '../types/data';
import { useState } from 'react';

const chartWidth = 720;
const chartHeight = 310;
const padding = { top: 42, right: 34, bottom: 48, left: 62 };
const magenta = '#ff7a45';
const green = '#d6b35a';
const blue = '#6ba7ff';

const xFor = (index: number, total: number) =>
  padding.left +
  (index / Math.max(1, total - 1)) * (chartWidth - padding.left - padding.right);

const yFor = (value: number, min: number, max: number) =>
  padding.top +
  (1 - (value - min) / Math.max(1, max - min)) *
    (chartHeight - padding.top - padding.bottom);

const compact = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}k`;
  }
  return `${Math.round(value)}`;
};

const signedPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

const yearTicks = (points: Array<{ key: string; label: string }>) => {
  const seen = new Set<string>();
  return points
    .map((point, index) => ({ point, index, year: point.key.slice(0, 4) }))
    .filter(({ year }) => {
      if (seen.has(year)) return false;
      seen.add(year);
      return true;
    });
};

type LineChartCardProps = {
  title: string;
  legend: string;
  data: ChartPoint[];
  yLabel: string;
  valueFormatter?: (value: number) => string;
  minOverride?: number;
};

export const GovLineChartCard = ({
  title,
  legend,
  data,
  yLabel,
  valueFormatter = compact,
  minOverride,
}: LineChartCardProps) => {
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(0, data.length - 1));
  const values = data.map((point) => point.value);
  const min = minOverride ?? Math.floor(Math.min(...values) * 0.92);
  const max = Math.ceil(Math.max(...values) * 1.04);
  const selectedPoint = data[selectedIndex] ?? data[data.length - 1];
  const selectedX = xFor(selectedIndex, data.length);
  const selectedY = yFor(selectedPoint.value, min, max);
  const path = data
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index, data.length)} ${yFor(point.value, min, max)}`)
    .join(' ');
  const ticks = yearTicks(data);

  return (
    <article className="gov-chart-card">
      <span className="gov-chart-card__info">i</span>
      <h3>{title}</h3>
      <div className="gov-chart-card__legend">
        <span style={{ background: magenta }} />
        {legend}
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={title}>
        {[0, 0.5, 1].map((tick) => {
          const y = padding.top + tick * (chartHeight - padding.top - padding.bottom);
          const value = max - tick * (max - min);
          return (
            <g key={tick}>
              <line className="gov-chart-card__grid" x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} />
              <text className="gov-chart-card__axis" x={padding.left - 12} y={y + 5} textAnchor="end">
                {valueFormatter(value)}
              </text>
            </g>
          );
        })}
        <text className="gov-chart-card__axis-label" x={18} y={chartHeight / 2} textAnchor="middle" transform={`rotate(-90 18 ${chartHeight / 2})`}>
          {yLabel}
        </text>
        <path className="gov-chart-card__line" d={path} />
        <line
          className="gov-chart-card__focus-line"
          x1={selectedX}
          x2={selectedX}
          y1={padding.top}
          y2={chartHeight - padding.bottom}
        />
        {data.map((point, index) => (
          <circle
            key={point.key}
            cx={xFor(index, data.length)}
            cy={yFor(point.value, min, max)}
            r={index === selectedIndex ? 6 : 2.8}
            className={index === selectedIndex ? 'gov-chart-card__dot gov-chart-card__dot--selected' : 'gov-chart-card__dot'}
          />
        ))}
        <circle cx={selectedX} cy={selectedY} r={12} className="gov-chart-card__focus-ring" />
        {data.map((point, index) => {
          const x = xFor(index, data.length);
          const hitWidth = Math.max(12, (chartWidth - padding.left - padding.right) / data.length);
          return (
            <rect
              key={`${point.key}-hit`}
              className="gov-chart-card__hit"
              x={x - hitWidth / 2}
              y={padding.top}
              width={hitWidth}
              height={chartHeight - padding.top - padding.bottom}
              tabIndex={0}
              onMouseEnter={() => setSelectedIndex(index)}
              onFocus={() => setSelectedIndex(index)}
              onClick={() => setSelectedIndex(index)}
            >
              <title>{`${point.label}: ${valueFormatter(point.value)}`}</title>
            </rect>
          );
        })}
        {ticks.map(({ index, year }) => (
          <text key={year} className="gov-chart-card__axis" x={xFor(index, data.length)} y={chartHeight - 16} textAnchor="middle">
            {year}
          </text>
        ))}
      </svg>
      <div className="gov-chart-card__readout">
        <span>{selectedPoint.label}</span>
        <strong>{valueFormatter(selectedPoint.value)}</strong>
      </div>
    </article>
  );
};

type BoroughChangeChartProps = {
  data: BoroughChangePoint[];
};

export const BoroughChangeChart = ({ data }: BoroughChangeChartProps) => {
  const [selectedIndex, setSelectedIndex] = useState(() =>
    Math.max(0, data.findIndex((point) => point.value === Math.max(...data.map((item) => item.value)))),
  );
  const min = Math.min(-1, Math.floor(Math.min(...data.map((point) => point.value))));
  const max = Math.max(1, Math.ceil(Math.max(...data.map((point) => point.value))));
  const zeroY = yFor(0, min, max);
  const plotWidth = chartWidth - padding.left - padding.right;
  const barWidth = plotWidth / data.length - 2;
  const selectedPoint = data[selectedIndex] ?? data[0];

  return (
    <article className="gov-chart-card">
      <span className="gov-chart-card__info">i</span>
      <h3>Change in all Crime by Borough</h3>
      <div className="gov-chart-card__legend">
        <span style={{ background: magenta }} />
        % change
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Change in all Crime by Borough">
        {[min, 0, max].map((tick) => {
          const y = yFor(tick, min, max);
          return (
            <g key={tick}>
              <line className="gov-chart-card__grid" x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} />
              <text className="gov-chart-card__axis" x={padding.left - 12} y={y + 5} textAnchor="end">
                {tick.toFixed(0)}%
              </text>
            </g>
          );
        })}
        <text className="gov-chart-card__axis-label" x={18} y={chartHeight / 2} textAnchor="middle" transform={`rotate(-90 18 ${chartHeight / 2})`}>
          Annual % change
        </text>
        {data.map((point, index) => {
          const x = padding.left + index * (plotWidth / data.length);
          const y = yFor(Math.max(point.value, 0), min, max);
          const height = Math.abs(yFor(point.value, min, max) - zeroY);
          return (
            <g key={point.name}>
              <rect
                className={index === selectedIndex ? 'gov-chart-card__bar gov-chart-card__bar--selected' : 'gov-chart-card__bar'}
                x={x}
                y={point.value >= 0 ? y : zeroY}
                width={barWidth}
                height={height}
              />
              <rect
                className="gov-chart-card__hit"
                x={x - 1}
                y={padding.top}
                width={barWidth + 2}
                height={chartHeight - padding.top - padding.bottom}
                tabIndex={0}
                onMouseEnter={() => setSelectedIndex(index)}
                onFocus={() => setSelectedIndex(index)}
                onClick={() => setSelectedIndex(index)}
              >
                <title>{`${point.name}: ${signedPercent(point.value)}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div className="gov-chart-card__readout">
        <span>{selectedPoint.name}</span>
        <strong>{signedPercent(selectedPoint.value)}</strong>
        <small>
          {compact(selectedPoint.total2024)} in 2024 {'->'} {compact(selectedPoint.total2025)} in 2025
        </small>
      </div>
    </article>
  );
};

type MultiLineChartProps = {
  data: PoliceStrengthPoint[];
};

export const PoliceStrengthChart = ({ data }: MultiLineChartProps) => {
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(0, data.length - 1));
  const series = [
    { key: 'policeOfficerStrength' as const, label: 'Police Officer Strength', color: magenta },
    { key: 'policeStaffStrength' as const, label: 'Police Staff Strength', color: green },
    { key: 'pcsoStrength' as const, label: 'PCSO Strength', color: blue },
  ];
  const values = data.flatMap((point) => series.map((item) => point[item.key]));
  const min = 0;
  const max = Math.ceil(Math.max(...values) * 1.12);
  const ticks = yearTicks(data).filter((_, index) => index % 2 === 0);
  const selectedPoint = data[selectedIndex] ?? data[data.length - 1];
  const selectedX = xFor(selectedIndex, data.length);

  return (
    <article className="gov-chart-card">
      <span className="gov-chart-card__info">i</span>
      <h3>Police Force Strength</h3>
      <div className="gov-chart-card__legend gov-chart-card__legend--multi">
        {series.map((item) => (
          <span key={item.key}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Police Force Strength">
        {[0, 0.5, 1].map((tick) => {
          const y = padding.top + tick * (chartHeight - padding.top - padding.bottom);
          const value = max - tick * (max - min);
          return (
            <g key={tick}>
              <line className="gov-chart-card__grid" x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} />
              <text className="gov-chart-card__axis" x={padding.left - 12} y={y + 5} textAnchor="end">
                {compact(value)}
              </text>
            </g>
          );
        })}
        <text className="gov-chart-card__axis-label" x={18} y={chartHeight / 2} textAnchor="middle" transform={`rotate(-90 18 ${chartHeight / 2})`}>
          Number
        </text>
        {series.map((item) => {
          const path = data
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index, data.length)} ${yFor(point[item.key], min, max)}`)
            .join(' ');
          return <path key={item.key} className="gov-chart-card__line" d={path} style={{ stroke: item.color }} />;
        })}
        <line
          className="gov-chart-card__focus-line"
          x1={selectedX}
          x2={selectedX}
          y1={padding.top}
          y2={chartHeight - padding.bottom}
        />
        {series.map((item) => (
          <circle
            key={`${item.key}-selected`}
            cx={selectedX}
            cy={yFor(selectedPoint[item.key], min, max)}
            r={5.5}
            className="gov-chart-card__dot gov-chart-card__dot--selected"
            style={{ fill: item.color }}
          />
        ))}
        {data.map((point, index) => {
          const x = xFor(index, data.length);
          const hitWidth = Math.max(8, (chartWidth - padding.left - padding.right) / data.length);
          return (
            <rect
              key={`${point.key}-hit`}
              className="gov-chart-card__hit"
              x={x - hitWidth / 2}
              y={padding.top}
              width={hitWidth}
              height={chartHeight - padding.top - padding.bottom}
              tabIndex={0}
              onMouseEnter={() => setSelectedIndex(index)}
              onFocus={() => setSelectedIndex(index)}
              onClick={() => setSelectedIndex(index)}
            >
              <title>{point.label}</title>
            </rect>
          );
        })}
        {ticks.map(({ index, year }) => (
          <text key={year} className="gov-chart-card__axis" x={xFor(index, data.length)} y={chartHeight - 16} textAnchor="middle">
            {year}
          </text>
        ))}
      </svg>
      <div className="gov-chart-card__readout gov-chart-card__readout--multi">
        <span>{selectedPoint.label}</span>
        {series.map((item) => (
          <strong key={item.key} style={{ color: item.color }}>
            {item.label}: {compact(selectedPoint[item.key])}
          </strong>
        ))}
      </div>
    </article>
  );
};
