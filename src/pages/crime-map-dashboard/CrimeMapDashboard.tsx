import { useMemo, useState, type CSSProperties } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import type { LeafletMouseEvent } from 'leaflet';
import ChoroplethMap from '../../components/ChoroplethMap';
import CrimeDeckMap from '../../components/CrimeDeckMap';
import type { CrimeDeckIncident } from '../../components/CrimeDeckMap';
import MapLegend from '../../components/MapLegend';
import { useJsonData } from '../../hooks/useJsonData';
import { PALETTES } from '../../lib/colors';
import { formatCompact, formatInteger, formatPercent, formatRate } from '../../lib/format';
import { buildQuantileBreaks } from '../../lib/stats';
import type {
  BoroughGeoJson,
  BoroughProperties,
  IncidentPayload,
  LsoaLookup,
  SummaryData,
} from '../../types/data';

type DashboardMode = 'borough' | 'hotspot3d';
type MetricMode = 'rate' | 'count';
type TimeSlice = 'year' | string;

const annualCountKey = 'count_2025' as keyof BoroughProperties;
const annualRateKey = 'rate_2025' as keyof BoroughProperties;
const annualOutcomesKey = 'outcomes_2025' as keyof BoroughProperties;

const valueFor = (borough: BoroughProperties | null | undefined, key: keyof BoroughProperties) => {
  const value = borough?.[key];
  return typeof value === 'number' ? value : null;
};

const niceAxisMax = (value: number) => {
  if (value <= 10) return Math.ceil(value / 2) * 2;
  if (value <= 50) return Math.ceil(value / 5) * 5;
  if (value <= 200) return Math.ceil(value / 10) * 10;
  if (value <= 2_000) return Math.ceil(value / 100) * 100;
  if (value <= 10_000) return Math.ceil(value / 1_000) * 1_000;
  return Math.ceil(value / 10_000) * 10_000;
};

const formatAxisTick = (value: number, mode: MetricMode) =>
  mode === 'count' ? formatCompact(value).replace('.0k', 'k') : Math.round(value).toLocaleString();

const CrimeMapDashboard = () => {
  const [mode, setMode] = useState<DashboardMode>('borough');

  const [metricMode, setMetricMode] = useState<MetricMode>('rate');
  const [selectedTime, setSelectedTime] = useState<TimeSlice>('year');
  const [selectedBorough, setSelectedBorough] = useState<BoroughProperties | null>(null);
  const [hoverDetail, setHoverDetail] = useState<{
    borough: BoroughProperties;
    x: number;
    y: number;
  } | null>(null);

  const [hotspotMonth, setHotspotMonth] = useState('2025-Q4');
  const [selectedType, setSelectedType] = useState('All crime types');

  const { data: summary } = useJsonData<SummaryData>('/data/summary.json');
  const { data: boroughs } = useJsonData<BoroughGeoJson>('/data/boroughs.geojson');
  const { data: lookup } = useJsonData<LsoaLookup>('/data/lsoaLookup.json');
  const { data: payload } = useJsonData<IncidentPayload>(`/data/incidents/${hotspotMonth}.json`);

  const availableMonths = useMemo(
    () => summary?.overview.availableMonths.filter((item) => item.key.startsWith('2025')) ?? [],
    [summary],
  );

  const annualTotals = useMemo(() => {
    const monthlyTotals = summary?.overview.monthlyTotals ?? [];
    return monthlyTotals.reduce(
      (totals, item) => ({
        offences: totals.offences + item.offences,
        positiveOutcomes: totals.positiveOutcomes + item.positiveOutcomes,
      }),
      { offences: 0, positiveOutcomes: 0 },
    );
  }, [summary]);

  const mappedBoroughs = useMemo(() => {
    if (!boroughs) {
      return null;
    }

    return {
      ...boroughs,
      features: boroughs.features.map((feature) => {
        const annualCount = availableMonths.reduce(
          (total, month) =>
            total + (valueFor(feature.properties, `count_${month.key}` as keyof BoroughProperties) ?? 0),
          0,
        );
        const annualOutcomes = availableMonths.reduce(
          (total, month) =>
            total +
            (valueFor(feature.properties, `outcomes_${month.key}` as keyof BoroughProperties) ?? 0),
          0,
        );
        const population = valueFor(feature.properties, 'population');
        const annualRate = population ? (annualCount / population) * 1000 : null;

        return {
          ...feature,
          properties: {
            ...feature.properties,
            [annualCountKey]: Math.round(annualCount),
            [annualRateKey]: annualRate == null ? null : Number(annualRate.toFixed(2)),
            [annualOutcomesKey]: Math.round(annualOutcomes),
          },
        };
      }),
    } as FeatureCollection<Geometry, BoroughProperties>;
  }, [availableMonths, boroughs]);

  const valueKey: keyof BoroughProperties =
    selectedTime === 'year'
      ? metricMode === 'rate'
        ? annualRateKey
        : annualCountKey
      : metricMode === 'rate'
        ? (`rate_${selectedTime}` as keyof BoroughProperties)
        : (`count_${selectedTime}` as keyof BoroughProperties);

  const countKey: keyof BoroughProperties =
    selectedTime === 'year' ? annualCountKey : (`count_${selectedTime}` as keyof BoroughProperties);
  const rateKey: keyof BoroughProperties =
    selectedTime === 'year' ? annualRateKey : (`rate_${selectedTime}` as keyof BoroughProperties);
  const outcomesKey: keyof BoroughProperties =
    selectedTime === 'year'
      ? annualOutcomesKey
      : (`outcomes_${selectedTime}` as keyof BoroughProperties);

  const sortedBoroughs = useMemo(() => {
    if (!mappedBoroughs) return [];
    return mappedBoroughs.features
      .map((feature) => feature.properties)
      .filter((properties) => typeof properties[valueKey] === 'number')
      .sort((left, right) => Number(right[valueKey]) - Number(left[valueKey]));
  }, [mappedBoroughs, valueKey]);

  const annualCountLeader = useMemo(() => {
    if (!mappedBoroughs) return null;
    return [...mappedBoroughs.features]
      .map((feature) => feature.properties)
      .filter((properties) => typeof properties[annualCountKey] === 'number')
      .sort((left, right) => Number(right[annualCountKey]) - Number(left[annualCountKey]))[0];
  }, [mappedBoroughs]);

  const annualRateLeader = useMemo(() => {
    if (!mappedBoroughs) return null;
    return [...mappedBoroughs.features]
      .map((feature) => feature.properties)
      .filter((properties) => typeof properties[annualRateKey] === 'number')
      .sort((left, right) => Number(right[annualRateKey]) - Number(left[annualRateKey]))[0];
  }, [mappedBoroughs]);

  const activeBorough = selectedBorough ?? null;

  const timeLabel =
    selectedTime === 'year'
      ? '2025'
      : (availableMonths.find((item) => item.key === selectedTime)?.label ?? selectedTime);

  const monthRecord =
    selectedTime === 'year'
      ? null
      : (summary?.overview.monthlyTotals.find((item) => item.month === selectedTime) ?? null);

  const selectedOffences = selectedTime === 'year' ? annualTotals.offences : (monthRecord?.offences ?? 0);

  const hoverBorough = hoverDetail?.borough ?? null;
  const hoverValue = valueFor(hoverBorough, valueKey);
  const hoverCount = valueFor(hoverBorough, countKey);
  const hoverRate = valueFor(hoverBorough, rateKey);
  const hoverOutcomes = valueFor(hoverBorough, outcomesKey);
  const hoverShare =
    hoverCount != null && selectedOffences > 0
      ? (Number(hoverCount) / selectedOffences) * 100
      : null;
  const hoverRank =
    hoverBorough == null
      ? null
      : sortedBoroughs.findIndex((borough) => borough.code === hoverBorough.code) + 1;

  const selectedMonthIndex =
    selectedTime === 'year' ? -1 : availableMonths.findIndex((item) => item.key === selectedTime);
  const timelineProgress =
    selectedMonthIndex < 0 || availableMonths.length <= 1
      ? 0
      : (selectedMonthIndex / (availableMonths.length - 1)) * 100;

  const hotspotMonthLabel =
    summary?.hotspots.availableMonths.find((item) => item.key === hotspotMonth)?.label ?? hotspotMonth;

  const deckIncidents = useMemo<CrimeDeckIncident[]>(() => {
    if (!payload || !lookup) return [];
    return payload.records.map((record) => {
      const lsoaCode = payload.lsoas[record[4]];
      return {
        lng: record[0],
        lat: record[1],
        category: payload.types[record[2]],
        borough: lookup[lsoaCode]?.borough,
      };
    });
  }, [payload, lookup]);

  const handleModeChange = (next: DashboardMode) => {
    setMode(next);
  };

  const handleTimeChange = (time: TimeSlice) => {
    setSelectedTime(time);
    setSelectedBorough(null);
  };

  const metricFormatter = metricMode === 'rate' ? formatRate : formatInteger;

  const numericValues = useMemo(() => {
    if (!mappedBoroughs) return [];
    return mappedBoroughs.features.reduce<number[]>((values, feature) => {
      const value = feature.properties[valueKey];
      if (typeof value === 'number') {
        values.push(value);
      }
      return values;
    }, []);
  }, [mappedBoroughs, valueKey]);

  const legendBreaks = useMemo(
    () => buildQuantileBreaks(numericValues, PALETTES.crime.length),
    [numericValues],
  );

  const topFiveBoroughs = sortedBoroughs.slice(0, 5);
  const topValueMax = Math.max(
    ...topFiveBoroughs.map((borough) => valueFor(borough, valueKey) ?? 0),
    1,
  );
  const chartAxisMax = niceAxisMax(topValueMax);
  const chartTicks = [chartAxisMax, chartAxisMax / 2, 0];

  const handleHoverBorough = (borough: BoroughProperties, event: LeafletMouseEvent) => {
    const point = event.containerPoint;
    const mapSize = (event.target as { _map?: { getSize?: () => { x: number; y: number } } })._map?.getSize?.();
    const popupWidth = 350;
    const popupHeight = 310;
    const x = mapSize && point.x > mapSize.x - popupWidth - 28 ? point.x - popupWidth - 18 : point.x + 18;
    const y = mapSize
      ? Math.min(Math.max(point.y - 12, 14), Math.max(mapSize.y - popupHeight - 14, 14))
      : Math.max(point.y - 12, 14);

    setHoverDetail({ borough, x, y });
  };

  const annualStatCards = [
    {
      label: 'Offence',
      value: formatCompact(annualTotals.offences),
      sub: '2025',
      detail: 'All monthly borough offence records in 2025.',
    },
    {
      label: 'Highest rate',
      value: formatRate(valueFor(annualRateLeader, annualRateKey)),
      sub: annualRateLeader?.name ?? 'Top borough',
      detail: (
        <>
          <strong>{annualRateLeader?.name ?? 'The leading borough'}</strong>
          <span>Small resident base plus heavy commuter and visitor footfall.</span>
        </>
      ),
    },
    {
      label: 'Highest count',
      value: formatInteger(valueFor(annualCountLeader, annualCountKey)),
      sub: annualCountLeader?.name ?? 'Top borough',
      detail: (
        <>
          <strong>{annualCountLeader?.name ?? 'The leading borough'}</strong>
          <span>records the largest offence volume across 2025.</span>
        </>
      ),
    },
    {
      label: 'Positive outcomes',
      value: formatCompact(annualTotals.positiveOutcomes),
      sub: '2025',
      detail: 'Records with a positive outcome in the annual borough series.',
    },
  ];

  const hotspotStatPills = [
    { label: 'Total incidents', value: formatCompact(deckIncidents.length), sub: hotspotMonthLabel },
    { label: 'Period', value: hotspotMonthLabel, sub: 'Current selection' },
    {
      label: 'Crime type',
      value: selectedType === 'All crime types' ? 'All' : selectedType,
      sub: 'Active filter',
    },
  ];

  return (
    <div className="crime-map-dashboard shell-width">
      <header className="cmd__header">
        <div className="cmd__title-block">
          <p className="cmd__kicker">London Crime Dashboard</p>
          <h1>Crime Map</h1>
        </div>

        <div className="cmd__mode-toggle">
          <button
            className={mode === 'borough' ? 'cmd__mode-btn cmd__mode-btn--active' : 'cmd__mode-btn'}
            onClick={() => handleModeChange('borough')}
          >
            Borough Overview
          </button>
          <button
            className={mode === 'hotspot3d' ? 'cmd__mode-btn cmd__mode-btn--active' : 'cmd__mode-btn'}
            onClick={() => handleModeChange('hotspot3d')}
          >
            3D Hotspots
          </button>
        </div>

        {mode === 'borough' ? (
          <div className="cmd__stat-strip cmd__stat-strip--annual">
            {annualStatCards.map((card) => (
              <article className="cmd__annual-stat-card" key={card.label} tabIndex={0}>
                <div className="cmd__annual-stat-card__front">
                  <span className="cmd__stat-pill__label">{card.label}</span>
                  <span className="cmd__stat-pill__value">{card.value}</span>
                  <span className="cmd__stat-pill__sub">{card.sub}</span>
                </div>
                <div className="cmd__annual-stat-card__detail">{card.detail}</div>
              </article>
            ))}
          </div>
        ) : (
          <div className="cmd__stat-strip">
            {hotspotStatPills.map((pill) => (
              <div className="cmd__stat-pill" key={pill.label}>
                <span className="cmd__stat-pill__label">{pill.label}</span>
                <span className="cmd__stat-pill__value">{pill.value}</span>
                <span className="cmd__stat-pill__sub">{pill.sub}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      <div className="cmd__stage">
        <div className="cmd__map-canvas">
          {mode === 'borough' ? (
            <ChoroplethMap
              data={mappedBoroughs}
              valueKey={valueKey}
              paletteName="crime"
              legendTitle={
                metricMode === 'rate'
                  ? `${timeLabel} offences per 1,000 residents`
                  : `${timeLabel} offences`
              }
              selectedCode={hoverBorough?.code ?? activeBorough?.code}
              onSelect={setSelectedBorough}
              onHover={handleHoverBorough}
              onHoverEnd={() => setHoverDetail(null)}
              valueFormatter={metricFormatter}
              fillContainer
              showLegend={false}
            >
              {hoverDetail ? (
                <article
                  className="cmd__hover-popup"
                  style={
                    {
                      '--cmd-popup-left': `${hoverDetail.x}px`,
                      '--cmd-popup-top': `${hoverDetail.y}px`,
                    } as CSSProperties
                  }
                >
                  <p className="cmd__float-panel__label">Selected borough</p>
                  <h3>{hoverDetail.borough.name}</h3>
                  <div className="cmd__hover-popup__focus">
                    <span>{metricMode === 'rate' ? `${timeLabel} rate` : `${timeLabel} count`}</span>
                    <strong>{metricFormatter(hoverValue)}</strong>
                    <small>{hoverRank ? `Rank ${hoverRank} of ${sortedBoroughs.length}` : 'No ranked value'}</small>
                  </div>
                  <div className="metric-list metric-list--compact">
                    <div>
                      <span>{timeLabel} offences</span>
                      <strong>{formatInteger(hoverCount)}</strong>
                    </div>
                    <div>
                      <span>{timeLabel} rate</span>
                      <strong>{formatRate(hoverRate)}</strong>
                    </div>
                    <div>
                      <span>Share of London</span>
                      <strong>{formatPercent(hoverShare)}</strong>
                    </div>
                    <div>
                      <span>{timeLabel} positive outcomes</span>
                      <strong>{formatInteger(hoverOutcomes)}</strong>
                    </div>
                  </div>
                </article>
              ) : null}

              {legendBreaks.length ? (
                <aside className="cmd__legend-panel" aria-label="Map legend">
                  <MapLegend
                    title={
                      metricMode === 'rate'
                        ? `${timeLabel} offences per 1,000 residents`
                        : `${timeLabel} offences`
                    }
                    palette={PALETTES.crime}
                    breaks={legendBreaks}
                    formatter={metricFormatter}
                  />
                </aside>
              ) : null}

              <aside className="cmd__top-chart-panel" aria-label="Top boroughs in current map">
                <div className="cmd__top-chart-heading">
                  <span>Top boroughs in current map</span>
                  <strong>{metricMode === 'rate' ? 'Rate' : 'Count'}</strong>
                </div>
                <div className="cmd__column-chart">
                  <div className="cmd__chart-axis" aria-hidden="true">
                    {chartTicks.map((tick) => (
                      <span key={tick}>{formatAxisTick(tick, metricMode)}</span>
                    ))}
                  </div>
                  {topFiveBoroughs.map((borough) => {
                    const value = valueFor(borough, valueKey);
                    return (
                      <button
                        key={borough.code}
                        className={
                          borough.code === (hoverBorough?.code ?? activeBorough?.code)
                            ? 'cmd__column-item cmd__column-item--active'
                            : 'cmd__column-item'
                        }
                        style={
                          {
                            '--cmd-bar-height': `${Math.max(((value ?? 0) / chartAxisMax) * 100, 4)}%`,
                          } as CSSProperties
                        }
                        onClick={() => setSelectedBorough(borough)}
                      >
                        <span className="cmd__column-tooltip">
                          <strong>{borough.name}</strong>
                          <em>{metricFormatter(value)}</em>
                        </span>
                        <span className="cmd__column-plot">
                          <span className="cmd__column-fill" />
                        </span>
                        <span className="cmd__column-name">{borough.name}</span>
                      </button>
                    );
                  })}
                </div>
              </aside>
            </ChoroplethMap>
          ) : payload && lookup ? (
            <CrimeDeckMap
              incidents={deckIncidents}
              selectedCrimeType={selectedType === 'All crime types' ? 'All' : selectedType}
              height="100%"
              crimeTypeOptions={summary?.hotspots.crimeTypes ?? []}
              onCrimeTypeChange={(val) =>
                setSelectedType(val === 'All' ? 'All crime types' : val)
              }
              monthOptions={
                summary?.hotspots.availableMonths.map((item) => ({
                  value: item.key,
                  label: item.label,
                })) ?? []
              }
              selectedMonth={hotspotMonth}
              selectedMonthLabel={hotspotMonthLabel}
              onMonthChange={setHotspotMonth}
            />
          ) : (
            <div className="cmd__map-loading">Loading incident data...</div>
          )}
        </div>

        {mode === 'borough' && (
          <>
            <aside className="cmd__float-panel cmd__float-panel--left">
              <p className="cmd__float-panel__label">Controls</p>

              <div className="cmd__metric-toggle">
                <span className="cmd__metric-toggle__label">Metric</span>
                <div className="cmd__metric-toggle__btns">
                  <button
                    className={metricMode === 'rate' ? 'active' : ''}
                    onClick={() => setMetricMode('rate')}
                  >
                    Rate
                  </button>
                  <button
                    className={metricMode === 'count' ? 'active' : ''}
                    onClick={() => setMetricMode('count')}
                  >
                    Count
                  </button>
                </div>
                <p className="cmd__metric-toggle__hint">
                  {metricMode === 'rate' ? 'Offences per 1,000 residents' : 'Recorded offence volume'}
                </p>
              </div>

              <div className="cmd__time-control">
                <div className="cmd__time-heading">
                  <span>Time</span>
                  <strong>{timeLabel}</strong>
                </div>

                <button
                  className={
                    selectedTime === 'year'
                      ? 'cmd__year-button cmd__year-button--active'
                      : 'cmd__year-button'
                  }
                  onClick={() => handleTimeChange('year')}
                >
                  <strong>2025</strong>
                  <span>Full year</span>
                </button>

                <div
                  className="cmd__month-timeline"
                  style={{ '--cmd-timeline-progress': `${timelineProgress}%` } as CSSProperties}
                >
                  <span className="cmd__month-timeline__track" aria-hidden="true">
                    <span className="cmd__month-timeline__fill" />
                  </span>
                  <div className="cmd__month-timeline__items">
                    {availableMonths.map((item, index) => (
                      <button
                        key={item.key}
                        className={
                          selectedTime === item.key
                            ? 'cmd__month-timeline__item cmd__month-timeline__item--active'
                            : index <= selectedMonthIndex
                              ? 'cmd__month-timeline__item cmd__month-timeline__item--passed'
                              : 'cmd__month-timeline__item'
                        }
                        onClick={() => handleTimeChange(item.key)}
                      >
                        <span className="cmd__month-timeline__node" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </aside>

          </>
        )}
      </div>
    </div>
  );
};

export default CrimeMapDashboard;
