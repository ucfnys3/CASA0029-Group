import { useMemo, useState } from 'react';
import type { PathOptions } from 'leaflet';
import SliderCompareMap from '../../components/SliderCompareMap';
import { useJsonData } from '../../hooks/useJsonData';
import { formatRate } from '../../lib/format';
import { PALETTES } from '../../lib/colors';
import type {
  CounterfactualModel,
  LsoaGeoJson,
  LsoaProperties,
  ModelPredictor,
} from '../../types/data';

type CrimeTypePredictor = { key: string; coefficient: number; mean: number };
type CrimeTypeSubModel = {
  target: string;
  intercept: number;
  predictors: CrimeTypePredictor[];
  rSquared: number;
  observations: number;
};
type CrimeTypeModels = { violent: CrimeTypeSubModel; property: CrimeTypeSubModel };

type LeverKey =
  | 'privateRenting'
  | 'deprivation'
  | 'recentMigration';

const LEVERS: Array<{
  key: LeverKey;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    key: 'privateRenting',
    label: 'Private renting',
    shortLabel: 'Renting',
    description:
      'Share of households in the private rented sector, used here as a proxy for tenure instability and residential churn.',
  },
  {
    key: 'deprivation',
    label: 'Deprivation',
    shortLabel: 'Depriv.',
    description:
      'Census 2021 household deprivation measure, used as the economic hardship lever in the sensitivity test.',
  },
  {
    key: 'recentMigration',
    label: 'Recent migration',
    shortLabel: 'Migr.',
    description:
      'Share of residents whose address one year earlier was elsewhere, used as a proxy for residential turnover.',
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

const ScenarioSimulationPage = () => {
  const { data, loading, error } = useJsonData<LsoaGeoJson>('/data/lsoa.geojson');
  const { data: model } = useJsonData<CounterfactualModel>(
    '/data/model_coefficients.json',
  );
  const { data: crimeTypeModels } = useJsonData<CrimeTypeModels>(
    '/data/crime_type_models.json',
  );

  const [lever, setLever] = useState<LeverKey>('deprivation');
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

  // Crime-type sub-model lookup: { violent: {key to coef}, property: {key to coef} }
  const crimeTypeLookup = useMemo<{
    violent: Record<string, CrimeTypePredictor>;
    property: Record<string, CrimeTypePredictor>;
  } | null>(() => {
    if (!crimeTypeModels) return null;
    const toMap = (preds: CrimeTypePredictor[]) =>
      preds.reduce<Record<string, CrimeTypePredictor>>((acc, p) => { acc[p.key] = p; return acc; }, {});
    return {
      violent:  toMap(crimeTypeModels.violent.predictors),
      property: toMap(crimeTypeModels.property.predictors),
    };
  }, [crimeTypeModels]);

  // Fixed scale computed once from ALL levers at maximum 50% reduction.
  // Does NOT depend on `lever` or `reductionPct`, so legend stays stable.
  const fixedReductionEdges = useMemo<{ edges: number[]; max: number }>(() => {
    const fallback = { edges: [2, 5, 10, 20], max: 25 };
    if (!data || !predictorLookup) return fallback;
    const leverKeys: LeverKey[] = [
      'privateRenting',
      'deprivation',
      'recentMigration',
    ];
    const allReductions: number[] = [];
    leverKeys.forEach((leverKey) => {
      const predictor = predictorLookup[leverKey];
      if (!predictor) return;
      const beta = predictor.coefficient;
      data.features.forEach((feature) => {
        const props = feature.properties;
        if (props.predictedCrimeRate == null) return;
        const current = props[leverKey];
        if (typeof current !== 'number') return;
        const delta = beta * (-current * 0.5);
        const sim = Math.max(0, props.predictedCrimeRate + delta);
        const reductionAmount = Math.max(0, props.predictedCrimeRate - sim);
        if (reductionAmount > 0) allReductions.push(reductionAmount);
      });
    });
    if (allReductions.length === 0) return fallback;
    allReductions.sort((a, b) => a - b);
    return {
      edges: [
        quantile(allReductions, 0.2),
        quantile(allReductions, 0.4),
        quantile(allReductions, 0.6),
        quantile(allReductions, 0.8),
      ],
      max: allReductions[allReductions.length - 1],
    };
  }, [data, predictorLookup]);

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
      const delta = beta * (-current * scale);
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
        fixedReductionEdges.edges,
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
      observed != null ? `Observed: ${formatRate(observed)}` : 'Observed: no data';
    const reductionLine =
      reduction != null
        ? `Model-implied drop: -${reduction.toFixed(1)} / 1k`
        : 'Model-implied drop: no data';
    return (
      `<strong>${properties.name}</strong><br/>` +
      `${observedLine}<br/>` +
      `${reductionLine}`
    );
  };

  if (loading) {
    return (
      <div className="fmap-page fmap-page--loading">
        Fitting the sensitivity model...
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="fmap-page fmap-page--loading">
        Could not load the scenario simulation page. {error}
      </div>
    );
  }

  const activeLever = LEVERS.find((l) => l.key === lever)!;

  return (
    <div className="fmap-page fmap-page--with-intro">

      {/* Top intro bar */}
      <div className="cf-page-intro">
        <div className="cf-page-intro__lead">
            <p className="fmap-panel__kicker">Scenario Simulation Section</p>
          <h2 className="cf-page-intro__title">What if one structural pressure eased?</h2>
          <p className="cf-page-intro__desc">
            An OLS model fitted across {model?.observations.toLocaleString() ?? '4,988'} London
            LSOAs (R² = {model ? model.rSquared.toFixed(2) : '0.19'}) relates structural
            indicators to crime rates. Select a pressure lever and a proportional reduction to see
            how predicted crime shifts — and which neighbourhoods respond most strongly.
            This is a sensitivity test, not a causal policy forecast.
          </p>
        </div>
        <div className="cf-page-intro__guide">
          <div className="cf-page-intro__item">
            <strong>Left map — scenario rate</strong>
            Predicted crime rate after the chosen pressure is hypothetically reduced in every LSOA.
            Colour scale fixed; areas with no model prediction appear dark.
          </div>
          <div className="cf-page-intro__item">
            <strong>Right map — implied reduction</strong>
            The model-implied drop per LSOA. Largest where the selected indicator is currently
            highest and positively associated with crime. Drag the divider to compare maps.
          </div>
          <div className="cf-page-intro__item">
            <strong>Crime type breakdown</strong>
            Each lever also shows estimated effects on violent crime and property crime
                  separately, connecting back to the crime-type divergence analysis.
          </div>
          <div className="cf-page-intro__item">
            <strong>Local vs London-wide reading</strong>
            Click any LSOA to switch from London-mean estimates to that neighbourhood's actual
            indicator level. High-pressure areas show a larger local effect than the city average.
          </div>
        </div>
      </div>

      {/* Map area */}
      <div className="fmap-map-area">

        <div className="fmap-canvas">
          <SliderCompareMap
            data={data}
            leftStyle={leftStyle}
            rightStyle={rightStyle}
            leftLabel={`Predicted rate | ${activeLever.shortLabel} -${reductionPct}%`}
            rightLabel={`Model-implied drop | ${activeLever.shortLabel} -${reductionPct}%`}
            onSelect={setSelectedLsoa}
            tooltipFormatter={tooltipFormatter}
            fillContainer
          />
        </div>

        {/* Left panel: controls + legends */}
        <aside className="fmap-panel fmap-panel--left">
          <div className="cf-control">
            <div className="fmap-section-label">1. Choose a lever</div>
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
            <div className="fmap-section-label">2. Proportional reduction</div>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={reductionPct}
              onChange={(e) => setReductionPct(Number(e.target.value))}
              className="cf-slider"
            />
            <div className="cf-slider__readout">
              <span>Every LSOA's {activeLever.label.toLowerCase()} x </span>
              <strong>{(1 - reductionPct / 100).toFixed(2)}</strong>
              <span> (-{reductionPct}%)</span>
            </div>
          </div>

          <div className="fmap-divider" />

          <div className="cf-legend cf-legend--left">
            <div className="cf-legend__title">Left map - predicted crime rate</div>
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

          <p className="fmap-panel__note fmap-panel__note--inline">
            Strictly correlational: this describes co-variation across London LSOAs,
            not the causal effect of an intervention.
          </p>
        </aside>

        <aside className="fmap-panel fmap-panel--right">
          <p className="fmap-panel__kicker">Model readout</p>

          <div className="cf-stat">
            <span className="cf-stat__label">Coefficient for {activeLever.label.toLowerCase()}</span>
            <strong className="cf-stat__value">
              {activePredictor ? activePredictor.coefficient.toFixed(2) : 'No data'}
            </strong>
            <span className="cf-stat__hint">
              crimes / 1,000 per +1 percentage-point rise, with other indicators held constant
            </span>
          </div>

          <div className="cf-stat">
            <span className="cf-stat__label">London mean</span>
            <strong className="cf-stat__value">
              {activePredictor ? `${activePredictor.mean.toFixed(1)}%` : 'No data'}
            </strong>
            <span className="cf-stat__hint">
              average {activeLever.label.toLowerCase()} level across London LSOAs
            </span>
          </div>

          <div className="cf-stat">
            <span className="cf-stat__label">
              {selectedLsoa ? `Local sensitivity at -${reductionPct}%` : `At-mean sensitivity at -${reductionPct}%`}
            </span>
            {activePredictor ? (() => {
              const localVal = selectedLsoa != null && typeof selectedLsoa[lever] === 'number'
                ? (selectedLsoa[lever] as number)
                : activePredictor.mean;
              const beta = activePredictor.coefficient;
              const crimeChange = beta * (-localVal * reductionPct / 100);
              const sign = crimeChange < 0 ? '-' : '+';
              return (
                <strong className={`cf-stat__value ${crimeChange < 0 ? 'cf-delta-neg' : 'cf-delta-pos'}`}>
                  {sign}{Math.abs(crimeChange).toFixed(1)}
                </strong>
              );
            })() : <strong className="cf-stat__value">No data</strong>}
            <span className="cf-stat__hint">
              {selectedLsoa
                ? `crimes / 1,000 at this LSOA (coefficient x local value x reduction%)`
                : `crimes / 1,000 at a typical LSOA (coefficient x mean x reduction%)`}
            </span>
          </div>

          {/* Crime type breakdown */}
          {crimeTypeLookup && activePredictor && (() => {
            const vBeta = crimeTypeLookup.violent[lever]?.coefficient ?? 0;
            const pBeta = crimeTypeLookup.property[lever]?.coefficient ?? 0;
            const localVal = selectedLsoa != null && typeof selectedLsoa[lever] === 'number'
              ? (selectedLsoa[lever] as number)
              : activePredictor.mean;
            const scale = reductionPct / 100;
            const vEffect = Math.abs(vBeta) * localVal * scale;
            const pEffect = Math.abs(pBeta) * localVal * scale;
            const vSign = vBeta > 0 ? '-' : '+';
            const pSign = pBeta > 0 ? '-' : '+';
            return (
              <div className="cf-type-split">
                <div className="fmap-section-label" style={{ marginBottom: '0.45rem' }}>
                  Crime type sensitivity
                </div>
                <div className="cf-type-split__row">
                  <span className="cf-type-split__dot" style={{ background: '#9b3ea8' }} />
                  <span className="cf-type-split__label">Violent crime</span>
                  <strong className={vBeta > 0 ? 'cf-delta-neg' : 'cf-delta-pos'}>
                    {vSign}{vEffect.toFixed(1)}
                  </strong>
                </div>
                <div className="cf-type-split__row">
                  <span className="cf-type-split__dot" style={{ background: '#1d7db5' }} />
                  <span className="cf-type-split__label">Property crime</span>
                  <strong className={pBeta > 0 ? 'cf-delta-neg' : 'cf-delta-pos'}>
                    {pSign}{pEffect.toFixed(1)}
                  </strong>
                </div>
                <p className="cf-type-split__hint">
                  crimes / 1,000 | {selectedLsoa ? 'local value' : 'London mean'} | -{reductionPct}%
                </p>
                <p className="cf-type-split__link">
                  Connects back to the crime-type mechanism section
                </p>
              </div>
            );
          })()}

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
                      : 'No data'}
                  </strong>
                </div>
                <div>
                  <span>Implied drop</span>
                  <strong className="cf-delta-neg">
                    {scenario.reduction[selectedLsoa.code] != null
                      ? `-${scenario.reduction[selectedLsoa.code].toFixed(1)}`
                      : 'No data'}
                  </strong>
                </div>
                <div>
                  <span>Local {activeLever.shortLabel}</span>
                  <strong>
                    {typeof selectedLsoa[lever] === 'number'
                      ? `${(selectedLsoa[lever] as number).toFixed(1)}%`
                      : 'No data'}
                  </strong>
                </div>
              </div>
            </>
          ) : null}

          {selectedLsoa ? (
            <div className="fmap-method-card">
              <strong className="fmap-method-card__title">
                How to read this local result
              </strong>
              <p className="fmap-method-card__body">
                Read this local result as model sensitivity, not as a promise of policy impact.
                A larger implied drop means the selected LSOA sits in a part of London where the
                chosen indicator is both high and strongly associated with crime in the fitted
                model, even after the other structural variables are held constant.
              </p>
            </div>
          ) : null}

          <div className="fmap-divider" />
          <div className="cf-legend cf-legend--right">
            <div className="cf-legend__title">Right map - model-implied reduction (crimes / 1,000)</div>
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
              {fixedReductionEdges.edges.map((edge, i) => (
                <span key={i}>{edge.toFixed(1)}</span>
              ))}
              <span>{fixedReductionEdges.max.toFixed(1)}+</span>
            </div>
          </div>

        </aside>

      </div>{/* end fmap-map-area */}
    </div>
  );
};

export default ScenarioSimulationPage;
