import { useMemo, useState } from 'react';
import ChoroplethMap from '../../components/ChoroplethMap';
import HotspotMap from '../../components/HotspotMap';
import LineChart from '../../components/LineChart';
import WheelSelector from '../../components/WheelSelector';
import { useJsonData } from '../../hooks/useJsonData';
import { formatCompact, formatInteger, formatPercent, formatRate } from '../../lib/format';
import { decodeCellSamples, filteredIncidentCount } from '../../lib/hotspots';
import type {
  BoroughGeoJson,
  BoroughProperties,
  HotspotCell,
  IncidentPayload,
  LsoaLookup,
  SummaryData,
} from '../../types/data';

type DashboardMode = 'borough' | 'hotspot';

const q4Months = ['202509', '202510', '202511', '202512'];

const periodCount = (borough: BoroughProperties | null, period: string) => {
  if (!borough) return null;
  return period === 'q4'
    ? borough.q4Offences
    : (borough[`count_${period}`] as number | null | undefined);
};

const periodRate = (borough: BoroughProperties | null, period: string) => {
  if (!borough) return null;
  return period === 'q4'
    ? borough.q4Rate
    : (borough[`rate_${period}`] as number | null | undefined);
};

const periodOutcomes = (borough: BoroughProperties | null, period: string) => {
  if (!borough) return null;
  if (period !== 'q4') {
    return borough[`outcomes_${period}`] as number | null | undefined;
  }
  return q4Months.reduce(
    (total, month) => total + Number(borough[`outcomes_${month}`] ?? 0),
    0,
  );
};

type CellDetailPanelProps = {
  cell: HotspotCell;
  isDrillDown: boolean;
};

const CellDetailPanel = ({ cell, isDrillDown }: CellDetailPanelProps) => {
  const sortedTypes = Object.entries(cell.typeCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = sortedTypes[0]?.[1] ?? 1;
  return (
    <>
      <div className="metric-list">
        <div>
          <span>Total incidents</span>
          <strong>{cell.count}</strong>
        </div>
        <div>
          <span>Dominant type</span>
          <strong>{cell.dominantType}</strong>
        </div>
        <div>
          <span>Dominant borough</span>
          <strong>{cell.dominantBorough}</strong>
        </div>
      </div>
      {isDrillDown ? (
        <ul className="cmd__type-bars">
          {sortedTypes.map(([type, count]) => (
            <li key={type}>
              <div className="cmd__type-bar-meta">
                <span>{type}</span>
                <strong>{count}</strong>
              </div>
              <div className="cmd__type-bar-track">
                <div
                  className="cmd__type-bar-fill"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cmd__drill-hint">
          Zoom further in and click a cell to see the crime type breakdown.
        </p>
      )}
    </>
  );
};

const CrimeMapDashboard = () => {
  const [mode, setMode] = useState<DashboardMode>('borough');

  const [metricMode, setMetricMode] = useState<'rate' | 'count'>('rate');
  const [boroughMonth, setBoroughMonth] = useState<string>('q4');
  const [selectedBorough, setSelectedBorough] = useState<BoroughProperties | null>(null);

  const [hotspotMonth, setHotspotMonth] = useState('2025-Q4');
  const [selectedType, setSelectedType] = useState('All crime types');
  const [selectedCell, setSelectedCell] = useState<HotspotCell | null>(null);
  const [isDrillDown, setIsDrillDown] = useState(false);

  const { data: summary } = useJsonData<SummaryData>('/data/summary.json');
  const { data: boroughs } = useJsonData<BoroughGeoJson>('/data/boroughs.geojson');
  const { data: lookup } = useJsonData<LsoaLookup>('/data/lsoaLookup.json');
  const { data: payload } = useJsonData<IncidentPayload>(`/data/incidents/${hotspotMonth}.json`);

  const valueKey =
    boroughMonth === 'q4'
      ? metricMode === 'rate'
        ? 'q4Rate'
        : 'q4Offences'
      : metricMode === 'rate'
        ? (`rate_${boroughMonth}` as keyof BoroughProperties)
        : (`count_${boroughMonth}` as keyof BoroughProperties);

  const sortedBoroughs = useMemo(() => {
    if (!boroughs) return [];
    return boroughs.features
      .map((f) => f.properties)
      .filter((p) => typeof p[valueKey] === 'number')
      .sort((a, b) => Number(b[valueKey]) - Number(a[valueKey]));
  }, [boroughs, valueKey]);

  const activeBorough = selectedBorough ?? sortedBoroughs[0] ?? null;

  const boroughMonthLabel =
    boroughMonth === 'q4'
      ? 'Q4 2025'
      : (summary?.overview.availableMonths.find((m) => m.key === boroughMonth)?.label ?? boroughMonth);

  const monthRecord =
    boroughMonth === 'q4'
      ? null
      : (summary?.overview.monthlyTotals.find((m) => m.month === boroughMonth) ?? null);

  const selectedOffences =
    boroughMonth === 'q4'
      ? (summary?.overview.overviewCards.q4Offences ?? 0)
      : (monthRecord?.offences ?? 0);

  const selectedPositiveOutcomes =
    boroughMonth === 'q4'
      ? (summary?.overview.overviewCards.q4PositiveOutcomes ?? 0)
      : (monthRecord?.positiveOutcomes ?? 0);

  const activeCount = periodCount(activeBorough, boroughMonth);
  const activeRate = periodRate(activeBorough, boroughMonth);
  const activeOutcomes = periodOutcomes(activeBorough, boroughMonth);
  const activeShare =
    activeCount != null && selectedOffences > 0
      ? (Number(activeCount) / selectedOffences) * 100
      : null;

  const boroughTimeOptions = [
    { value: 'q4', label: 'Q4 2025', description: 'Sep–Dec combined' },
    ...(summary?.overview.availableMonths.map((m) => ({
      value: m.key,
      label: m.label,
      description: 'Monthly borough series',
    })) ?? []),
  ];

  const hotspotMonthLabel =
    summary?.hotspots.availableMonths.find((m) => m.key === hotspotMonth)?.label ?? hotspotMonth;

  const filteredCount = payload && lookup ? filteredIncidentCount(payload, selectedType) : 0;
  const sampledIncidents =
    payload && lookup ? decodeCellSamples(payload, lookup, selectedCell) : [];
  const monthSummary =
    summary?.hotspots.monthSummaries.find((e) => e.month === hotspotMonth) ?? null;

  const handleSelectCell = (cell: HotspotCell) => {
    setSelectedCell(cell);
    setIsDrillDown(false);
  };

  const handleDrillDown = (_cell: HotspotCell) => {
    setIsDrillDown(true);
  };

  const handleModeChange = (next: DashboardMode) => {
    setMode(next);
    setSelectedCell(null);
    setIsDrillDown(false);
  };

  const statPills =
    mode === 'borough'
      ? [
          { label: 'Offences', value: formatCompact(selectedOffences), sub: boroughMonthLabel },
          { label: 'Positive outcomes', value: formatCompact(selectedPositiveOutcomes), sub: boroughMonthLabel },
          { label: 'Selected borough', value: activeBorough?.name ?? '—', sub: formatRate(activeRate) },
        ]
      : [
          { label: 'Visible incidents', value: formatCompact(filteredCount), sub: hotspotMonthLabel },
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
            className={mode === 'hotspot' ? 'cmd__mode-btn cmd__mode-btn--active' : 'cmd__mode-btn'}
            onClick={() => handleModeChange('hotspot')}
          >
            Incident Hotspots
          </button>
        </div>

        <div className="cmd__stat-strip">
          {statPills.map((pill) => (
            <div className="cmd__stat-pill" key={pill.label}>
              <span className="cmd__stat-pill__label">{pill.label}</span>
              <span className="cmd__stat-pill__value">{pill.value}</span>
              <span className="cmd__stat-pill__sub">{pill.sub}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Floating map stage ── */}
      <div className="cmd__stage">
        {/* Map canvas fills the stage */}
        <div className="cmd__map-canvas">
          {mode === 'borough' ? (
            <ChoroplethMap
              data={boroughs}
              valueKey={valueKey}
              paletteName="crime"
              legendTitle={
                metricMode === 'rate'
                  ? `${boroughMonthLabel} offences per 1,000 residents`
                  : `${boroughMonthLabel} offences`
              }
              selectedCode={activeBorough?.code}
              onSelect={setSelectedBorough}
              valueFormatter={metricMode === 'rate' ? formatRate : formatInteger}
              fillContainer
              caption="Click a borough to update the profile panel."
            />
          ) : payload && lookup ? (
            <HotspotMap
              payload={payload}
              selectedType={selectedType}
              lookup={lookup}
              boroughs={boroughs}
              selectedCell={selectedCell}
              onSelectCell={handleSelectCell}
              onDrillDown={handleDrillDown}
              fillContainer
            />
          ) : (
            <div className="cmd__map-loading">Loading incident data…</div>
          )}
        </div>

        {/* Left floating panel: controls */}
        <aside className="cmd__float-panel cmd__float-panel--left">
          <p className="cmd__float-panel__label">Controls</p>

          {mode === 'borough' ? (
            <>
              {/* Rate / Count toggle — replaces WheelSelector */}
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

              <WheelSelector
                label="Time"
                value={boroughMonth}
                maxHeight={220}
                options={boroughTimeOptions}
                onChange={(value) => {
                  setBoroughMonth(value);
                  setSelectedBorough(null);
                }}
              />

              <div className="cmd__insight-box">
                Crime is concentrated, not evenly spread. Westminster's extreme rate reflects
                tourist footfall — east London hotspots tie more closely to residential deprivation.
              </div>
            </>
          ) : (
            <>
              <WheelSelector
                label="Month"
                value={hotspotMonth}
                maxHeight={200}
                options={
                  summary?.hotspots.availableMonths.map((m) => ({
                    value: m.key,
                    label: m.label,
                    description: m.key === '2025-Q4' ? 'Combined view' : 'Single month',
                  })) ?? []
                }
                onChange={(value) => {
                  setHotspotMonth(value);
                  setSelectedCell(null);
                  setIsDrillDown(false);
                }}
              />
              <WheelSelector
                label="Crime type"
                value={selectedType}
                maxHeight={260}
                options={[
                  { value: 'All crime types', label: 'All crime types', description: 'Full selected period' },
                  ...(summary?.hotspots.crimeTypes.map((type) => ({ value: type, label: type })) ?? []),
                ]}
                onChange={(value) => {
                  setSelectedType(value);
                  setSelectedCell(null);
                  setIsDrillDown(false);
                }}
              />
            </>
          )}
        </aside>

        {/* Right floating panel: data */}
        <aside className="cmd__float-panel cmd__float-panel--right">
          {mode === 'borough' ? (
            <>
              <div className="cmd__float-section">
                <p className="cmd__float-panel__label">Selected borough</p>
                <h3 className="cmd__float-title">{activeBorough?.name ?? '—'}</h3>
                <div className="metric-list">
                  <div>
                    <span>{boroughMonthLabel} offences</span>
                    <strong>{formatInteger(activeCount)}</strong>
                  </div>
                  <div>
                    <span>{boroughMonthLabel} rate</span>
                    <strong>{formatRate(activeRate)}</strong>
                  </div>
                  <div>
                    <span>Outcomes</span>
                    <strong>{formatInteger(activeOutcomes)}</strong>
                  </div>
                  <div>
                    <span>Share of London</span>
                    <strong>{formatPercent(activeShare)}</strong>
                  </div>
                  <div>
                    <span>Top crime type</span>
                    <strong>{activeBorough?.dominantTypeQ4 ?? '—'}</strong>
                  </div>
                </div>
              </div>

              <div className="cmd__float-section">
                <p className="cmd__float-panel__label">
                  Top boroughs · {metricMode === 'rate' ? 'rate' : 'count'}
                </p>
                <ol className="cmd__ranking">
                  {sortedBoroughs.slice(0, 8).map((borough, i) => (
                    <li key={borough.code} className="cmd__ranking__item">
                      <span className="cmd__ranking__rank">{i + 1}</span>
                      <div className="cmd__ranking__body">
                        <strong>{borough.name}</strong>
                        {borough.dominantTypeQ4 ? <small>{borough.dominantTypeQ4}</small> : null}
                      </div>
                      <span className="cmd__ranking__value">
                        {metricMode === 'rate'
                          ? formatRate(borough[valueKey] as number | null)
                          : formatInteger(borough[valueKey] as number | null)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {summary && (
                <div className="cmd__float-section">
                  <LineChart
                    title="Monthly pattern 2025"
                    points={summary.overview.monthlyTotals.map((m) => ({
                      key: m.month,
                      label: m.label,
                      value: m.offences,
                    }))}
                    activeKey={boroughMonth === 'q4' ? undefined : boroughMonth}
                    valueFormatter={formatInteger}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="cmd__float-section">
                <p className="cmd__float-panel__label">Selected hotspot</p>
                {selectedCell ? (
                  <CellDetailPanel cell={selectedCell} isDrillDown={isDrillDown} />
                ) : (
                  <p className="cmd__drill-hint">
                    Click any cell. At low zoom the map zooms in automatically; at high zoom a
                    crime type breakdown appears here.
                  </p>
                )}
              </div>

              {selectedCell && sampledIncidents.length > 0 && (
                <div className="cmd__float-section">
                  <p className="cmd__float-panel__label">Sample incidents</p>
                  <ul className="incident-list">
                    {sampledIncidents.slice(0, 6).map((incident, index) => (
                      <li key={`${incident.location}-${index}`}>
                        <strong>{incident.type}</strong>
                        <span>{incident.location}</span>
                        <small>{incident.lsoaName} / {incident.borough}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {monthSummary && (
                <div className="cmd__float-section">
                  <p className="cmd__float-panel__label">Top crime types · {hotspotMonthLabel}</p>
                  <ul className="mini-list">
                    {monthSummary.topCrimeTypes.map((item) => (
                      <li key={item.name}>
                        <span>{item.name}</span>
                        <strong>{formatCompact(item.count)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default CrimeMapDashboard;
