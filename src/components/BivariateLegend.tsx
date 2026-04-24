import { BIVARIATE_PALETTE } from '../lib/colors';

type BivariateLegendProps = {
  activeBin?: number | null;
  onCellClick?: (bin: number | null) => void;
  xLabel?: string;
  yLabel?: string;
};

const BivariateLegend = ({
  activeBin,
  onCellClick,
  xLabel = 'Structural pressure →',
  yLabel = 'Crime rate →',
}: BivariateLegendProps) => {
  return (
    <div className="bivariate-legend">
      <div className="bivariate-legend__y-label">{yLabel}</div>
      <div className="bivariate-legend__grid-wrap">
        <div
          className="bivariate-legend__grid"
          role="group"
          aria-label="Bivariate classification legend"
        >
          {[2, 1, 0].map((crimeBin) =>
            [0, 1, 2].map((vulnBin) => {
              const bin = crimeBin * 3 + vulnBin;
              const isActive = activeBin === bin;
              const cellClass = `bivariate-legend__cell${isActive ? ' active' : ''}${onCellClick ? ' interactive' : ''}`;
              return (
                <button
                  type="button"
                  key={bin}
                  className={cellClass}
                  style={{ backgroundColor: BIVARIATE_PALETTE[bin] }}
                  onClick={() => {
                    if (!onCellClick) return;
                    onCellClick(isActive ? null : bin);
                  }}
                  aria-label={`Crime bin ${crimeBin}, pressure bin ${vulnBin}`}
                  aria-pressed={isActive}
                  tabIndex={onCellClick ? 0 : -1}
                />
              );
            }),
          )}
        </div>
        <div className="bivariate-legend__x-label">{xLabel}</div>
      </div>
    </div>
  );
};

export default BivariateLegend;
