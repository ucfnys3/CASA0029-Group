/**
 * CorrelationDivergingChart
 * -------------------------
 * A horizontal diverging bar chart comparing Spearman correlations of
 * structural indicators with violent crime vs property crime.
 *
 * Each row = one indicator.
 * Left bars  = property crime correlation (blue)
 * Right bars = violent crime correlation  (purple)
 */

type CorrelationRow = {
  key: string;
  label: string;
  violentRho: number;
  propertyRho: number;
};

type Props = {
  correlations: CorrelationRow[];
  width?: number;
};

const VIOLENT_COLOR  = '#b565b0';
const PROPERTY_COLOR = '#3ea8d8';

const CorrelationDivergingChart = ({ correlations, width = 320 }: Props) => {
  const ROW_H     = 28;
  const LABEL_W   = 106;
  const BAR_AREA  = width - LABEL_W - 8;   // space for bars on each side
  const HALF      = BAR_AREA / 2;
  const CENTER_X  = LABEL_W + HALF;
  const TICK_VALS = [0, 0.2, 0.4, 0.6];
  const HEIGHT    = correlations.length * ROW_H + 36;

  const toX = (rho: number) => HALF * (rho / 0.6);   // scale to [0, 0.6]

  return (
    <svg
      viewBox={`0 0 ${width} ${HEIGHT}`}
      width="100%"
      height="auto"
      className="corr-diverg-chart"
      role="img"
      aria-label="Correlation diverging chart"
    >
      {/* ── header labels ── */}
      <text
        x={CENTER_X - 6}
        y={12}
        textAnchor="end"
        className="corr-diverg-chart__head corr-diverg-chart__head--property"
      >
        ← Property
      </text>
      <text
        x={CENTER_X + 6}
        y={12}
        textAnchor="start"
        className="corr-diverg-chart__head corr-diverg-chart__head--violent"
      >
        Violent →
      </text>

      {/* ── vertical grid lines + tick labels ── */}
      {TICK_VALS.map((t) => {
        const xR = CENTER_X + toX(t);
        const xL = CENTER_X - toX(t);
        return (
          <g key={t}>
            {t > 0 && (
              <>
                <line
                  x1={xR} x2={xR}
                  y1={20} y2={HEIGHT - 16}
                  className="corr-diverg-chart__grid"
                />
                <line
                  x1={xL} x2={xL}
                  y1={20} y2={HEIGHT - 16}
                  className="corr-diverg-chart__grid"
                />
                <text x={xR} y={HEIGHT - 4} textAnchor="middle" className="corr-diverg-chart__tick">
                  {t.toFixed(1)}
                </text>
                <text x={xL} y={HEIGHT - 4} textAnchor="middle" className="corr-diverg-chart__tick">
                  {t.toFixed(1)}
                </text>
              </>
            )}
            {t === 0 && (
              <>
                <line
                  x1={CENTER_X} x2={CENTER_X}
                  y1={18} y2={HEIGHT - 16}
                  className="corr-diverg-chart__center"
                />
                <text x={CENTER_X} y={HEIGHT - 4} textAnchor="middle" className="corr-diverg-chart__tick">
                  0
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* ── rows ── */}
      {correlations.map((row, i) => {
        const y   = 20 + i * ROW_H;
        const mid = y + ROW_H / 2;
        const barH = 10;

        const vW  = Math.max(1, toX(Math.abs(row.violentRho)));
        const pW  = Math.max(1, toX(Math.abs(row.propertyRho)));

        return (
          <g key={row.key}>
            {/* row background on hover */}
            <rect
              x={0} y={y} width={width} height={ROW_H}
              className="corr-diverg-chart__row-bg"
            />

            {/* label */}
            <text
              x={LABEL_W - 6}
              y={mid + 1}
              textAnchor="end"
              dominantBaseline="middle"
              className="corr-diverg-chart__label"
            >
              {row.label}
            </text>

            {/* property bar (goes LEFT) */}
            <rect
              x={CENTER_X - pW}
              y={mid - barH / 2}
              width={pW}
              height={barH}
              fill={PROPERTY_COLOR}
              opacity={0.82}
              rx={2}
            />
            {/* property value */}
            <text
              x={CENTER_X - pW - 3}
              y={mid + 1}
              textAnchor="end"
              dominantBaseline="middle"
              className="corr-diverg-chart__val"
            >
              {row.propertyRho.toFixed(2)}
            </text>

            {/* violent bar (goes RIGHT) */}
            <rect
              x={CENTER_X}
              y={mid - barH / 2}
              width={vW}
              height={barH}
              fill={VIOLENT_COLOR}
              opacity={0.82}
              rx={2}
            />
            {/* violent value */}
            <text
              x={CENTER_X + vW + 3}
              y={mid + 1}
              textAnchor="start"
              dominantBaseline="middle"
              className="corr-diverg-chart__val"
            >
              {row.violentRho.toFixed(2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default CorrelationDivergingChart;
export type { CorrelationRow };
