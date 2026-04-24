import { useMemo, useState } from 'react';
import type { PathOptions } from 'leaflet';
import SliderCompareMap from '../components/SliderCompareMap';
import { useJsonData } from '../hooks/useJsonData';
import { formatRate } from '../lib/format';
import { PALETTES } from '../lib/colors';
import type {
  CounterfactualModel,
  LsoaGeoJson,
  LsoaProperties,
  ModelPredictor,
} from '../types/data';

type LeverKey =
  | 'unemployment'
  | 'privateRenting'
  | 'badHealth'
  | 'youthShare';

const LEVERS: Array<{
  key: LeverKey;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    key: 'unemployment',
    label: 'Unemployment',
    shortLabel: 'Unemp.',
    description:
      '% of working-age residents unemployed. A proxy for labour-market exclusion.',
  },
  {
    key: 'privateRenting',
    label: 'Private renting',
    shortLabel: 'Renting',
    description:
      '% of households in the private rented sector — a proxy for tenure instability.',
  },
  {
    key: 'badHealth',
    label: 'Bad health',
    shortLabel: 'Health',
    description:
      '% of residents reporting bad or very bad general health (2021 Census).',
  },
  {
    key: 'youthShare',
    label: 'Youth 16–24',
    shortLabel: 'Youth',
    description:
      '% of residents aged 16–24 — captures the life-stage associated with transition pressure.',
  },
];

const CRIME_BIN_EDGES = [30, 60, 100, 160] as const;
const CRIME_PALETTE = PALETTES.crime;

// Green gradient for reduction magnitude on the right map.
const REDUCTION_PALETTE = ['#e5dbb5', '#bccf7f', '#7fae5f', '#3d8253', '#14523a'];
const NO_DATA_COLOR = '#2d2822';

const binIndexForRate = (rate: number | null | undefined): number => {
  if (rate == null || Number.isNaN(rate)) return -1;
  for (let i = 0; i < CRIME_BIN_EDGES.length; i += 1) {
    if (rate < CRIME_BIN_EDGES[i]) return i;
  }
  return CRIME_BIN_EDGES.length;
};

const colorForRate = (rate: number | null | undefined): string => {
  const idx = binIndexForRate(rate);
  if (idx < 0) return NO_DATA_COLOR;
  return CRIME_PALETTE[idx];
};

const colorForReduction = (
  delta: number | null | undefined,
  edges: readonly number[],
): string => {
  if (delta == null || Number.isNaN(delta) || delta <= 0.001) {
    if (delta == null) return NO_DATA_COLOR;
    return REDUCTION_PALETTE[0];
  }
  for (let i = 0; i < edges.length; i += 1) {
    if (delta < edges[i]) return REDUCTION_PALETTE[i];
  }
  return REDUCTION_PALETTE[REDUCTION_PALETTE.length - 1];
};

const formatDelta = (value: number): string => {
  const rounded = value.toFixed(1);
  if (value > 0) return `+${rounded}`;
  return rounded;
};

const quantile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(sorted.length * p)),
  );
  return sorted[idx];
};

const PriorityPlacesPage = () => {
  const { data, loading, error } = useJsonData<LsoaGeoJson>('/data/lsoa.geojson');
  const { data: model } = useJsonData<CounterfactualModel>(
    '/data/model_coefficients.json',
  );

  const [lever, setLever] = useState<LeverKey>('unemployment');
  const [reductionPct, setReductionPct] = useState<number>(20);
  const [selectedLsoa, setSelectedLsoa] = useState<LsoaProperties | null>(null);

  const predictorLookup = useMemo<Record<string, ModelPredictor> | null>(() => {
    if (!model) return null;
    return model.predictors.reduce<Record<string, ModelPredictor>>((acc, p) => {
      acc[p.key] = p;
      return acc;
    }, {});
  }, [model]);

  const activePredictor = predictorLookup ? predictorLookup[lever] : null;

  const scenario = useMemo<{
    simulated: Record<string, number>;
    reduction: Record<string, number>;
    reductionEdges: number[];
    maxReduction: number;
  }>(() => {
    const empty = {
      simulated: {},
      reduction: {},
      reductionEdges: [0, 0, 0, 0],
      maxReduction: 0,
    };
    if (!data || !activePredictor) return empty;
    const scale = reductionPct / 100;
    const beta = activePredictor.coefficient;
    const simulated: Record<string, number> = {};
    const reduction: Record<string, number> = {};
    const reductionValues: number[] = [];
    data.features.forEach((feature) => {
      const props = feature.properties;
      if (props.predictedCrimeRate == null) return;
      const current = props[lever];
      if (typeof current !== 'number') return;
      const delta = beta * (-current * scale); // negative for positive β
      const sim = Math.max(0, props.predictedCrimeRate + delta);
      simulated[props.code] = sim;
      const reductionAmount = Math.max(0, props.predictedCrimeRate - sim);
      reduction[props.code] = reductionAmount;
      if (reductionAmount > 0) reductionValues.push(reductionAmount);
    });
    if (reductionValues.length === 0) {
      return { simulated, reduction, reductionEdges: [0, 0, 0, 0], maxReduction: 0 };
    }
    reductionValues.sort((a, b) => a - b);
    const reductionEdges = [
      quantile(reductionValues, 0.2),
      quantile(reductionValues, 0.4),
      quantile(reductionValues, 0.6),
      quantile(reductionValues, 0.8),
    ];
    return {
      simulated,
      reduction,
      reductionEdges,
      maxReduction: reductionValues[reductionValues.length - 1],
    };
  }, [data, activePredictor, lever, reductionPct]);

  const simulated = scenario.simulated;

  const londonChange = useMemo(() => {
    if (!data || !activePredictor) return null;
    let observedSum = 0;
    let observedN = 0;
    let predictedSum = 0;
    let simulatedSum = 0;
    let predictedN = 0;
    data.features.forEach((feature) => {
      const props = feature.properties;
      if (typeof props.crimeRate === 'number') {
        observedSum += props.crimeRate;
        observedN += 1;
      }
      if (props.predictedCrimeRate != null && simulated[props.code] != null) {
        predictedSum += props.predictedCrimeRate;
        simulatedSum += simulated[props.code];
        predictedN += 1;
      }
    });
    if (predictedN === 0) return null;
    const observedMean = observedN ? observedSum / observedN : 0;
    const predictedMean = predictedSum / predictedN;
    const simulatedMean = simulatedSum / predictedN;
    return {
      observedMean,
      predictedMean,
      simulatedMean,
      absDelta: simulatedMean - predictedMean,
      relDelta:
        predictedMean > 0
          ? ((simulatedMean - predictedMean) / predictedMean) * 100
          : 0,
      count: predictedN,
    };
  }, [data, activePredictor, simulated]);

  const leftStyle = (properties: LsoaProperties): PathOptions => {
    const isSelected = selectedLsoa?.code === properties.code;
    const scenarioRate = simulated[properties.code];
    return {
      fillColor: colorForRate(scenarioRate),
      fillOpacity: scenarioRate == null ? 0.15 : 0.86,
      weight: isSelected ? 2 : 0.4,
      opacity: 1,
      color: isSelected ? '#ffe2a3' : 'rgba(20, 14, 10, 0.4)',
    };
  };

  const rightStyle = (properties: LsoaProperties): PathOptions => {
    const isSelected = selectedLsoa?.code === properties.code;
    const reduction = scenario.reduction[properties.code];
    const hasPrediction = reduction != null;
    return {
      fillColor: colorForReduction(
        hasPrediction ? reduction : null,
        scenario.reductionEdges,
      ),
      fillOpacity: hasPrediction ? 0.86 : 0.15,
      weight: isSelected ? 2 : 0.4,
      opacity: 1,
      color: isSelected ? '#ffe2a3' : 'rgba(20, 14, 10, 0.4)',
    };
  };

  const tooltipFormatter = (properties: LsoaProperties): string => {
    const observed = properties.crimeRate;
    const reduction = scenario.reduction[properties.code];
    const observedLine =
      observed != null ? `Observed: ${formatRate(observed)}` : 'Observed: —';
    const reductionLine =
      reduction != null
        ? `Implied drop: −${reduction.toFixed(1)} / 1k`
        : 'Implied drop: — (insufficient data)';
    return (
      `<strong>${properties.name}</strong><br/>` +
      `${observedLine}<br/>` +
      `${reductionLine}`
    );
  };

  if (loading) {
    return (
      <div className="fmap-page fmap-page--loading">
        Fitting the counterfactual model…
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="fmap-page fmap-page--loading">
        Could not load the priority page. {error}
      </div>
    );
  }

  const activeLever = LEVERS.find((l) => l.key === lever)!;
  const activeBetaAbs = activePredictor
    ? Math.abs(activePredictor.coefficient).toFixed(2)
    : '—';

  return (
    <div className="fmap-page">
      <div className="fmap-canvas">
        <SliderCompareMap
          data={data}
          leftStyle={leftStyle}
          rightStyle={rightStyle}
          leftLabel={`Predicted rate · ${activeLever.shortLabel} −${reductionPct}%`}
          rightLabel={`Implied drop · ${activeLever.shortLabel} −${reductionPct}%`}
          onSelect={setSelectedLsoa}
          tooltipFormatter={tooltipFormatter}
          fillContainer
        />
      </div>

      <div className="cf-legend cf-legend--left">
        <div className="cf-legend__title">Predicted crime rate</div>
        <div className="cf-legend__swatches">
          {CRIME_PALETTE.map((color, i) => (
            <span
              key={color}
              className="cf-legend__swatch"
              style={{ background: color }}
              aria-label={`bin ${i}`}
            />
          ))}
        </div>
        <div className="cf-legend__scale">
          <span>0</span>
          {CRIME_BIN_EDGES.map((edge) => (
            <span key={edge}>{edge}</span>
          ))}
          <span>per 1k</span>
        </div>
      </div>

      <div className="cf-legend cf-legend--right">
        <div className="cf-legend__title">
          Implied reduction (crimes / 1,000)
        </div>
        <div className="cf-legend__swatches">
          {REDUCTION_PALETTE.map((color, i) => (
            <span
              key={color}
              className="cf-legend__swatch"
              style={{ background: color }}
              aria-label={`reduction bin ${i}`}
            />
          ))}
        </div>
        <div className="cf-legend__scale">
          <span>0</span>
          {scenario.reductionEdges.map((edge, i) => (
            <span key={i}>{edge.toFixed(1)}</span>
          ))}
          <span>{scenario.maxReduction.toFixed(1)}+</span>
        </div>
      </div>

      <aside className="fmap-panel fmap-panel--left">
        <p className="fmap-panel__kicker">Page 6 · A correlational thought experiment</p>
        <h2 className="fmap-panel__title">What if one pressure eased?</h2>
        <p className="fmap-panel__desc">
          An OLS model fits crime rate on the structural indicators from Page 4 across
          {' '}{model?.observations.toLocaleString() ?? '4,653'} LSOAs (R² ={' '}
          {model ? model.rSquared.toFixed(2) : '—'}). Pick an indicator and a proportional
          reduction: the right map redraws each LSOA using the model's implied crime rate
          under that scenario. Drag the divider to compare.
        </p>

        <div className="cf-control">
          <div className="fmap-section-label">1 · Choose a lever</div>
          <div className="fmap-var-list">
            {LEVERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`fmap-var-btn${lever === item.key ? ' active' : ''}`}
                onClick={() => setLever(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="fmap-var-desc">{activeLever.description}</p>
        </div>

        <div className="cf-control">
          <div className="fmap-section-label">2 · Proportional reduction</div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={reductionPct}
            onChange={(e) => setReductionPct(Number(e.target.value))}
            className="cf-slider"
          />
          <div className="cf-slider__readout">
            <span>Every LSOA's {activeLever.label.toLowerCase()} × </span>
            <strong>{(1 - reductionPct / 100).toFixed(2)}</strong>
            <span> (−{reductionPct}%)</span>
          </div>
        </div>

        <p className="fmap-panel__note">
          Strictly correlational. The model describes how crime rates co-vary with
          structural indicators across London — not what would happen if a policy
          intervention changed one of them. Unobserved confounders are baked into β.
        </p>
      </aside>

      <aside className="fmap-panel fmap-panel--right">
        <p className="fmap-panel__kicker">Model readout</p>

        <div className="cf-stat">
          <span className="cf-stat__label">β for {activeLever.label.toLowerCase()}</span>
          <strong className="cf-stat__value">
            {activePredictor ? activePredictor.coefficient.toFixed(2) : '—'}
          </strong>
          <span className="cf-stat__hint">
            crimes / 1,000 residents per +1pp in {activeLever.label.toLowerCase()}
          </span>
        </div>

        <p className="fmap-panel__desc" style={{ fontSize: '0.78rem' }}>
          Controlling for the other six structural indicators, a one-percentage-point
          increase in {activeLever.label.toLowerCase()} is associated with{' '}
          <strong>
            {activePredictor && activePredictor.coefficient >= 0 ? '+' : ''}
            {activeBetaAbs}
          </strong>{' '}
          crimes per 1,000 residents in the same quarter.
        </p>

        <div className="fmap-divider" />
        <p className="fmap-panel__kicker">London-wide effect</p>
        {londonChange ? (
          <div className="cf-london">
            <div className="cf-london__row">
              <span>Base prediction</span>
              <strong>{londonChange.predictedMean.toFixed(1)}</strong>
            </div>
            <div className="cf-london__row">
              <span>Scenario mean</span>
              <strong>{londonChange.simulatedMean.toFixed(1)}</strong>
            </div>
            <div className="cf-london__row cf-london__row--delta">
              <span>Implied change</span>
              <strong
                className={
                  londonChange.absDelta < 0 ? 'cf-delta-neg' : 'cf-delta-pos'
                }
              >
                {formatDelta(londonChange.absDelta)} ({formatDelta(londonChange.relDelta)}%)
              </strong>
            </div>
          </div>
        ) : null}

        {selectedLsoa ? (
          <>
            <div className="fmap-divider" />
            <p className="fmap-panel__kicker">Selected LSOA</p>
            <h3 className="fmap-panel__title" style={{ fontSize: '0.95rem' }}>
              {selectedLsoa.name}
            </h3>
            <div className="metric-list">
              <div>
                <span>Borough</span>
                <strong>{selectedLsoa.borough}</strong>
              </div>
              <div>
                <span>Observed rate</span>
                <strong>{formatRate(selectedLsoa.crimeRate)}</strong>
              </div>
              <div>
                <span>Base prediction</span>
                <strong>{formatRate(selectedLsoa.predictedCrimeRate)}</strong>
              </div>
              <div>
                <span>Scenario rate</span>
                <strong>
                  {simulated[selectedLsoa.code] != null
                    ? formatRate(simulated[selectedLsoa.code])
                    : '—'}
                </strong>
              </div>
              <div>
                <span>Implied drop</span>
                <strong className="cf-delta-neg">
                  {scenario.reduction[selectedLsoa.code] != null
                    ? `−${scenario.reduction[selectedLsoa.code].toFixed(1)}`
                    : '—'}
                </strong>
              </div>
              <div>
                <span>Local {activeLever.shortLabel}</span>
                <strong>
                  {typeof selectedLsoa[lever] === 'number'
                    ? `${(selectedLsoa[lever] as number).toFixed(1)}%`
                    : '—'}
                </strong>
              </div>
            </div>
          </>
        ) : null}

        <div className="fmap-takeaway">
          The coefficients say high-rent, high-youth, high-ill-health neighbourhoods
          co-occur with higher crime after controlling for each other. Moving any
          single axis moves the prediction only a little — compound pressures, not
          any one lever, define the crime gradient.
        </div>
      </aside>
    </div>
  );
};

export default PriorityPlacesPage;
