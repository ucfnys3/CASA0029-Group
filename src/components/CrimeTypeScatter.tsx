/**
 * CrimeTypeScatter
 * ----------------
 * X = property crime rate score (0–100)
 * Y = violent crime rate score  (0–100)
 * Quadrant split at 50 on both axes.
 * Each dot coloured by its quadrant bin (same palette as the map).
 */
import { useMemo } from 'react';
import { CRIME_TYPE_PALETTE, CRIME_TYPE_LABELS } from '../lib/colors';
import type { LsoaProperties } from '../types/data';

export type CrimeTypePoint = {
  code: string;
  x: number;   // property share (0–100 %)
  y: number;   // crimeRateScore (0–100 percentile)
  bin: number; // 0-3
};

export const pointsFromLsoa = (features: LsoaProperties[]): CrimeTypePoint[] =>
  features
    .filter(
      (p) =>
        typeof p.violentRate    === 'number' &&
        typeof p.propertyRate   === 'number' &&
        typeof p.crimeRateScore === 'number' &&
        (p.violentRate as number) + (p.propertyRate as number) > 0,
    )
    .map((p) => {
      const total     = (p.violentRate as number) + (p.propertyRate as number);
      const propShare = ((p.propertyRate as number) / total) * 100;
      const highProp  = propShare >= 50 ? 1 : 0;
      const highCrime = (p.crimeRateScore as number) > 50 ? 1 : 0;
      return {
        code: p.code,
        x:    propShare,
        y:    p.crimeRateScore as number,
        bin:  highCrime * 2 + highProp,
      };
    });

type Props = {
  points: CrimeTypePoint[];
  selectedCode?: string | null;
  highlightedCodes?: Set<string> | null;
  activeBin?: number | null;
  onSelect?: (code: string) => void;
  width?: number;
  height?: number;
};

const pad = { top: 16, right: 16, bottom: 36, left: 44 };

const CrimeTypeScatter = ({
  points,
  selectedCode,
  highlightedCodes,
  activeBin,
  onSelect,
  width  = 360,
  height = 300,
}: Props) => {
  const plotW = width  - pad.left - pad.right;
  const plotH = height - pad.top  - pad.bottom;

  const sx = (v: number) => pad.left + (v / 100) * plotW;
  const sy = (v: number) => pad.top  + plotH - (v / 100) * plotH;

  const ticks = useMemo(() => [0, 25, 50, 75, 100], []);

  const hasFocus = (code: string, bin: number) =>
    selectedCode === code ||
    (highlightedCodes?.has(code) ?? false) ||
    (activeBin != null && activeBin === bin);

  const anyFocus =
    !!selectedCode ||
    (highlightedCodes && highlightedCodes.size > 0) ||
    activeBin != null;

  // quadrant label positions (X=propertyShare, Y=crimeRateScore, cut at 50)
  const qLabels = [
    { x: sx(25), y: sy(75), label: 'High crime · violence-led', bin: 2 },
    { x: sx(75), y: sy(75), label: 'High crime · property-led', bin: 3 },
    { x: sx(25), y: sy(25), label: 'Low crime · violence-led',  bin: 0 },
    { x: sx(75), y: sy(25), label: 'Low crime · property-led',  bin: 1 },
  ];

  return (
    <svg
      className="ct-scatter"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="auto"
      role="img"
      aria-label="Crime type quadrant scatter plot"
    >
      {/* frame */}
      <rect
        x={pad.left} y={pad.top}
        width={plotW} height={plotH}
        className="bivariate-scatter__frame"
      />

      {/* grid + ticks */}
      {ticks.map((t) => (
        <g key={`xt-${t}`}>
          <line className="bivariate-scatter__grid"
            x1={sx(t)} x2={sx(t)} y1={pad.top} y2={pad.top + plotH} />
          <text className="bivariate-scatter__tick"
            x={sx(t)} y={pad.top + plotH + 14} textAnchor="middle">{t}</text>
        </g>
      ))}
      {ticks.map((t) => (
        <g key={`yt-${t}`}>
          <line className="bivariate-scatter__grid"
            x1={pad.left} x2={pad.left + plotW} y1={sy(t)} y2={sy(t)} />
          <text className="bivariate-scatter__tick"
            x={pad.left - 6} y={sy(t)} textAnchor="end" dominantBaseline="middle">{t}</text>
        </g>
      ))}

      {/* quadrant dividers at 50 */}
      <line className="bivariate-scatter__tertile"
        x1={sx(50)} x2={sx(50)} y1={pad.top} y2={pad.top + plotH} />
      <line className="bivariate-scatter__tertile"
        x1={pad.left} x2={pad.left + plotW} y1={sy(50)} y2={sy(50)} />

      {/* quadrant background tints */}
      {[
        { x: sx(0),  y: sy(100), w: plotW/2, h: plotH/2, bin: 2 },
        { x: sx(50), y: sy(100), w: plotW/2, h: plotH/2, bin: 3 },
        { x: sx(0),  y: sy(50),  w: plotW/2, h: plotH/2, bin: 0 },
        { x: sx(50), y: sy(50),  w: plotW/2, h: plotH/2, bin: 1 },
      ].map(({ x, y, w, h, bin }) => (
        <rect
          key={`qbg-${bin}`}
          x={x} y={y} width={w} height={h}
          fill={CRIME_TYPE_PALETTE[bin]}
          opacity={activeBin != null ? (activeBin === bin ? 0.10 : 0.02) : 0.06}
        />
      ))}

      {/* quadrant labels */}
      {qLabels.map(({ x, y, label, bin }) => (
        <text
          key={`ql-${bin}`}
          x={x} y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="ct-scatter__qlabel"
          fill={CRIME_TYPE_PALETTE[bin]}
          opacity={activeBin != null ? (activeBin === bin ? 0.9 : 0.2) : 0.55}
        >
          {label}
        </text>
      ))}

      {/* dots */}
      {points.map((pt) => {
        const focused = hasFocus(pt.code, pt.bin);
        const dimmed  = anyFocus && !focused;
        const r = selectedCode === pt.code ? 4.5 : focused ? 3 : 1.8;
        return (
          <circle
            key={pt.code}
            cx={sx(pt.x)} cy={sy(pt.y)} r={r}
            fill={CRIME_TYPE_PALETTE[pt.bin]}
            className={`bivariate-scatter__dot${selectedCode === pt.code ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`}
            onClick={() => onSelect?.(pt.code)}
          >
            <title>{`Violent: ${pt.y.toFixed(1)} · Property: ${pt.x.toFixed(1)}`}</title>
          </circle>
        );
      })}

      {/* axis labels */}
      <text className="bivariate-scatter__axis-label"
        x={pad.left + plotW / 2} y={height - 4} textAnchor="middle">
        Property share of crime (%)
      </text>
      <text className="bivariate-scatter__axis-label"
        transform={`rotate(-90) translate(${-(pad.top + plotH / 2)}, 14)`}
        textAnchor="middle">
        Crime intensity score
      </text>
    </svg>
  );
};

export { CRIME_TYPE_LABELS };
export default CrimeTypeScatter;
