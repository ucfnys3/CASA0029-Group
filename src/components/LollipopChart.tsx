import { useMemo } from 'react';
import { useJsonData } from '../hooks/useJsonData';

interface Correlation {
  variable: string;
  label: string;
  spearman: number;
  r_squared: number;
  significant: boolean;
  description: string;
  n: number;
}

interface ResearchStats {
  correlations: Correlation[];
  meta: {
    n_lsoa: number;
    method: string;
    crime_variable: string;
    data_year: string;
  };
}

const BAR_MAX_WIDTH = 220;

const LollipopChart = () => {
  const { data, loading, error } = useJsonData<ResearchStats>('/data/research_stats.json');

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.correlations].sort((a, b) => Math.abs(b.spearman) - Math.abs(a.spearman));
  }, [data]);

  const maxRho = useMemo(() => Math.max(...sorted.map((c) => Math.abs(c.spearman)), 0.01), [sorted]);

  if (loading) return null;
  if (error || !data) return null;

  return (
    <div className="lollipop-chart">
      <header className="lollipop-chart__header">
        <p className="lollipop-chart__eyebrow">Statistical evidence</p>
        <h3>Which neighbourhood characteristics correlate with higher crime?</h3>
        <p className="lollipop-chart__sub">
          Spearman rank correlation across {data.meta.n_lsoa.toLocaleString()} London neighbourhoods · 2021 Census
        </p>
      </header>

      <div className="lollipop-chart__rows" role="list" aria-label="Correlation chart">
        {sorted.map((c) => {
          const barWidth = (Math.abs(c.spearman) / maxRho) * BAR_MAX_WIDTH;
          return (
            <div
              key={c.variable}
              className={`lollipop-chart__row${c.significant ? ' lollipop-chart__row--significant' : ''}`}
              role="listitem"
              title={c.description}
            >
              <span className="lollipop-chart__label">{c.label}</span>
              <div className="lollipop-chart__track" aria-hidden="true">
                <div className="lollipop-chart__bar" style={{ width: `${barWidth}px` }} />
                <div className="lollipop-chart__dot" style={{ left: `${barWidth}px` }} />
              </div>
              <span className="lollipop-chart__rho">
                {c.spearman > 0 ? '+' : ''}{c.spearman.toFixed(3)}
                {c.significant ? '' : ' ◦'}
              </span>
            </div>
          );
        })}
      </div>

      <footer className="lollipop-chart__footer">
        ◦ Below threshold (|ρ| &lt; 0.25) · {data.meta.data_year}
      </footer>
    </div>
  );
};

export default LollipopChart;
