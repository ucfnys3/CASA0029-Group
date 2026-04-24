import { useMemo } from 'react';
import { BIVARIATE_PALETTE } from '../lib/colors';
import type { LsoaProperties } from '../types/data';

export type BivariateScatterPoint = {
  code: string;
  x: number;
  y: number;
  bin: number;
};

type BivariateScatterProps = {
  points: BivariateScatterPoint[];
  selectedCode?: string | null;
  highlightedCodes?: Set<string> | null;
  activeBin?: number | null;
  onSelect?: (code: string) => void;
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
};

const pointsFromFeatures = (features: LsoaProperties[]): BivariateScatterPoint[] =>
  features
    .filter(
      (p) =>
        typeof p.compositeVulnerabilityScore === 'number' &&
        typeof p.crimeRateScore === 'number' &&
        typeof p.bivariateBin === 'number',
    )
    .map((p) => ({
      code: p.code,
      x: p.compositeVulnerabilityScore as number,
      y: p.crimeRateScore as number,
      bin: p.bivariateBin as number,
    }));

const padding = { top: 16, right: 16, bottom: 36, left: 40 };

const BivariateScatter = ({
  points,
  selectedCode,
  highlightedCodes,
  activeBin,
  onSelect,
  width = 360,
  height = 320,
  xLabel = 'Structural pressure (0–100)',
  yLabel = 'Crime rate score (0–100)',
}: BivariateScatterProps) => {
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const scaleX = (v: number) => padding.left + (v / 100) * plotW;
  const scaleY = (v: number) => padding.top + plotH - (v / 100) * plotH;

  const ticks = useMemo(() => [0, 25, 50, 75, 100], []);

  const hasFocus = (code: string, bin: number): boolean => {
    if (selectedCode === code) return true;
    if (highlightedCodes?.has(code)) return true;
    if (activeBin != null && activeBin === bin) return true;
    return false;
  };
  const anyFocus =
    (highlightedCodes && highlightedCodes.size > 0) ||
    activeBin != null ||
    !!selectedCode;

  return (
    <svg
      className="bivariate-scatter"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Crime rate vs structural pressure scatter plot"
      width="100%"
      height="auto"
    >
      <rect
        x={padding.left}
        y={padding.top}
        width={plotW}
        height={plotH}
        className="bivariate-scatter__frame"
      />

      {ticks.map((t) => (
        <g key={`x-${t}`}>
          <line
            className="bivariate-scatter__grid"
            x1={scaleX(t)}
            x2={scaleX(t)}
            y1={padding.top}
            y2={padding.top + plotH}
          />
          <text
            className="bivariate-scatter__tick"
            x={scaleX(t)}
            y={padding.top + plotH + 14}
            textAnchor="middle"
          >
            {t}
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <g key={`y-${t}`}>
          <line
            className="bivariate-scatter__grid"
            x1={padding.left}
            x2={padding.left + plotW}
            y1={scaleY(t)}
            y2={scaleY(t)}
          />
          <text
            className="bivariate-scatter__tick"
            x={padding.left - 6}
            y={scaleY(t)}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {t}
          </text>
        </g>
      ))}

      <line
        className="bivariate-scatter__tertile"
        x1={scaleX(33.33)}
        x2={scaleX(33.33)}
        y1={padding.top}
        y2={padding.top + plotH}
      />
      <line
        className="bivariate-scatter__tertile"
        x1={scaleX(66.66)}
        x2={scaleX(66.66)}
        y1={padding.top}
        y2={padding.top + plotH}
      />
      <line
        className="bivariate-scatter__tertile"
        x1={padding.left}
        x2={padding.left + plotW}
        y1={scaleY(33.33)}
        y2={scaleY(33.33)}
      />
      <line
        className="bivariate-scatter__tertile"
        x1={padding.left}
        x2={padding.left + plotW}
        y1={scaleY(66.66)}
        y2={scaleY(66.66)}
      />

      {points.map((pt) => {
        const focused = hasFocus(pt.code, pt.bin);
        const dimmed = anyFocus && !focused;
        const r = selectedCode === pt.code ? 4.2 : focused ? 2.8 : 2;
        return (
          <circle
            key={pt.code}
            cx={scaleX(pt.x)}
            cy={scaleY(pt.y)}
            r={r}
            fill={BIVARIATE_PALETTE[pt.bin]}
            className={`bivariate-scatter__dot${selectedCode === pt.code ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`}
            onClick={() => onSelect?.(pt.code)}
          >
            <title>{`Crime: ${pt.y.toFixed(1)} · Pressure: ${pt.x.toFixed(1)}`}</title>
          </circle>
        );
      })}

      <text
        className="bivariate-scatter__axis-label"
        x={padding.left + plotW / 2}
        y={height - 6}
        textAnchor="middle"
      >
        {xLabel}
      </text>
      <text
        className="bivariate-scatter__axis-label"
        transform={`rotate(-90) translate(${-(padding.top + plotH / 2)}, 12)`}
        textAnchor="middle"
      >
        {yLabel}
      </text>
    </svg>
  );
};

export { pointsFromFeatures };
export default BivariateScatter;
