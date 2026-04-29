/**
 * CrimeTypeLegend — 2×2 clickable matrix
 *
 * Layout (matching scatter axes — property on X, violent on Y):
 *   [Violence-dominant (2)]  [Both elevated (3)]
 *   [Both low (0)]           [Property-dominant (1)]
 */
import { CRIME_TYPE_PALETTE, CRIME_TYPE_LABELS } from '../lib/colors';

// [top-left, top-right, bottom-left, bottom-right] → bin indices
const GRID = [2, 3, 0, 1] as const;

const DESCRIPTIONS: Record<number, string> = {
  0: 'Low on both axes',
  1: 'Above median for property, below for violent',
  2: 'Above median for violent, below for property',
  3: 'Above median on both axes',
};

type Props = {
  activeBin: number | null;
  onCellClick: (bin: number | null) => void;
};

const CrimeTypeLegend = ({ activeBin, onCellClick }: Props) => (
  <div className="ct-legend">
    {/* Y-axis label */}
    <div className="ct-legend__y-label">
      <span>↑ Violent</span>
    </div>

    <div>
      {/* 2×2 grid */}
      <div className="ct-legend__grid">
        {GRID.map((bin) => {
          const isActive = activeBin === bin;
          return (
            <button
              key={bin}
              className={`ct-legend__cell${isActive ? ' ct-legend__cell--active' : ''}`}
              style={{
                background: CRIME_TYPE_PALETTE[bin],
                opacity: activeBin != null && !isActive ? 0.35 : 1,
              }}
              title={`${CRIME_TYPE_LABELS[bin]}: ${DESCRIPTIONS[bin]}`}
              onClick={() => onCellClick(isActive ? null : bin)}
            >
              <span className="ct-legend__cell-label">{CRIME_TYPE_LABELS[bin]}</span>
            </button>
          );
        })}
      </div>

      {/* X-axis label */}
      <div className="ct-legend__x-label">
        <span>Property →</span>
      </div>
    </div>
  </div>
);

export default CrimeTypeLegend;
