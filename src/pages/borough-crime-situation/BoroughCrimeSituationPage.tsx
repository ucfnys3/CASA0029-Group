import { useMemo, useState } from 'react';
import ChoroplethMap from '../../components/ChoroplethMap';
import LineChart from '../../components/LineChart';
import RankingList from '../../components/RankingList';
import WheelSelector from '../../components/WheelSelector';
import { useJsonData } from '../../hooks/useJsonData';
import { formatCompact, formatInteger, formatPercent, formatRate } from '../../lib/format';
import type { BoroughGeoJson, BoroughProperties, SummaryData } from '../../types/data';

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

const BoroughCrimeSituationPage = () => {
  const { data: summary, loading: summaryLoading, error: summaryError } =
    useJsonData<SummaryData>('/data/summary.json');
  const { data: boroughs, loading: boroughLoading, error: boroughError } =
    useJsonData<BoroughGeoJson>('/data/boroughs.geojson');
  const [metricMode, setMetricMode] = useState<'rate' | 'count'>('rate');
  const [selectedMonth, setSelectedMonth] = useState<'q4' | string>('q4');
  const [selectedBorough, setSelectedBorough] = useState<BoroughProperties | null>(null);

  const valueKey =
    selectedMonth === 'q4'
      ? metricMode === 'rate'
        ? 'q4Rate'
        : 'q4Offences'
      : metricMode === 'rate'
        ? (`rate_${selectedMonth}` as keyof BoroughProperties)
        : (`count_${selectedMonth}` as keyof BoroughProperties);

  const sortedBoroughs = useMemo(() => {
    if (!boroughs) return [];
    return boroughs.features
      .map((feature) => feature.properties)
      .filter((properties) => typeof properties[valueKey] === 'number')
      .sort((left, right) => Number(right[valueKey]) - Number(left[valueKey]));
  }, [boroughs, valueKey]);

  if (summaryLoading || boroughLoading) {
    return <div className="shell-width page-shell">Loading borough crime situation...</div>;
  }

  if (!summary || !boroughs || summaryError || boroughError) {
    return (
      <div className="shell-width page-shell">
        Could not load the borough crime page. {summaryError ?? boroughError}
      </div>
    );
  }

  const activeBorough = selectedBorough ?? sortedBoroughs[0] ?? null;
  const monthRecord =
    selectedMonth === 'q4'
      ? null
      : summary.overview.monthlyTotals.find((item) => item.month === selectedMonth) ?? null;
  const selectedOffences =
    selectedMonth === 'q4'
      ? summary.overview.overviewCards.q4Offences
      : monthRecord?.offences ?? 0;
  const selectedPositiveOutcomes =
    selectedMonth === 'q4'
      ? summary.overview.overviewCards.q4PositiveOutcomes
      : monthRecord?.positiveOutcomes ?? 0;
  const monthLabel =
    selectedMonth === 'q4'
      ? 'Q4 2025'
      : summary.overview.availableMonths.find((item) => item.key === selectedMonth)?.label ??
        selectedMonth;
  const activeCount = periodCount(activeBorough, selectedMonth);
  const activeRate = periodRate(activeBorough, selectedMonth);
  const activeOutcomes = periodOutcomes(activeBorough, selectedMonth);
  const activeShare =
    activeCount != null && selectedOffences > 0 ? (Number(activeCount) / selectedOffences) * 100 : null;
  const categories =
    summary.overview.topCategoriesByPeriod?.[selectedMonth] ?? summary.overview.topCategoriesQ4;
  const timeOptions = [
    { value: 'q4', label: 'Q4 2025', description: 'Sep-Dec combined' },
    ...summary.overview.availableMonths.map((item) => ({
      value: item.key,
      label: item.label,
      description: 'Monthly borough series',
    })),
  ];

  return (
    <div className="borough-dashboard">
      <section className="borough-dashboard__header">
        <div>
          <p className="borough-dashboard__kicker">Page 3 / borough crime situation</p>
          <h1>London borough crime dashboard</h1>
          <p>
            A macro view of recorded crime across London boroughs, rebuilt around the interaction
            pattern of the previous dashboard while keeping the atlas visual language.
          </p>
        </div>
        <div className="borough-dashboard__period">
          <span>Current view</span>
          <strong>{monthLabel}</strong>
        </div>
      </section>

      <section className="borough-dashboard__main">
        <div className="borough-dashboard__map">
          <ChoroplethMap
            data={boroughs}
            valueKey={valueKey}
            paletteName="crime"
            legendTitle={
              metricMode === 'rate'
                ? `${monthLabel} offences per 1,000 residents`
                : `${monthLabel} offences`
            }
            selectedCode={activeBorough?.code}
            onSelect={setSelectedBorough}
            valueFormatter={metricMode === 'rate' ? formatRate : formatInteger}
            height={720}
            caption="Click a borough to update the profile panel."
          >
            <div className="borough-map-summary">
              <span>Current sector</span>
              <strong>{activeBorough?.name ?? 'London'}</strong>
              <div>
                <b>{formatInteger(activeCount)}</b>
                <small>offences in {monthLabel}</small>
              </div>
              <div>
                <b>{formatRate(activeRate)}</b>
                <small>resident-adjusted rate</small>
              </div>
            </div>
          </ChoroplethMap>
        </div>

        <aside className="borough-dashboard__rail">
          <div className="borough-dashboard__cards">
            <article className="borough-mini-stat">
              <span>Offences</span>
              <strong>{formatCompact(selectedOffences)}</strong>
              <p>{monthLabel} London total</p>
            </article>
            <article className="borough-mini-stat">
              <span>Positive outcomes</span>
              <strong>{formatCompact(selectedPositiveOutcomes)}</strong>
              <p>{monthLabel} London total</p>
            </article>
          </div>

          <article className="panel-card borough-controls">
            <p className="panel-card__eyebrow">Controls</p>
            <WheelSelector
              label="Metric"
              value={metricMode}
              helper="2 modes"
              maxHeight={144}
              options={[
                {
                  value: 'rate',
                  label: 'Rate',
                  description: 'Offences per 1,000 residents',
                },
                {
                  value: 'count',
                  label: 'Count',
                  description: 'Recorded offence volume',
                },
              ]}
              onChange={(value) => setMetricMode(value as 'rate' | 'count')}
            />
            <WheelSelector
              label="Time"
              value={selectedMonth}
              maxHeight={232}
              options={timeOptions}
              onChange={(value) => {
                setSelectedMonth(value);
                setSelectedBorough(null);
              }}
            />
          </article>

          <article className="panel-card borough-profile">
            <p className="panel-card__eyebrow">Selected borough</p>
            <h3>{activeBorough?.name ?? 'No borough selected'}</h3>
            <div className="metric-list">
              <div>
                <span>{monthLabel} offences</span>
                <strong>{formatInteger(activeCount)}</strong>
              </div>
              <div>
                <span>{monthLabel} rate</span>
                <strong>{formatRate(activeRate)}</strong>
              </div>
              <div>
                <span>{monthLabel} outcomes</span>
                <strong>{formatInteger(activeOutcomes)}</strong>
              </div>
              <div>
                <span>Share of London total</span>
                <strong>{formatPercent(activeShare)}</strong>
              </div>
              <div>
                <span>Dominant Q4 category</span>
                <strong>{activeBorough?.dominantTypeQ4 ?? 'No data'}</strong>
              </div>
            </div>
          </article>

          <LineChart
            title="Monthly pattern through 2025"
            points={summary.overview.monthlyTotals.map((item) => ({
              key: item.month,
              label: item.label,
              value: item.offences,
            }))}
            activeKey={selectedMonth === 'q4' ? undefined : selectedMonth}
            valueFormatter={formatInteger}
          />
        </aside>
      </section>

      <section className="borough-dashboard__bottom">
        <RankingList
          title={`Top boroughs by ${metricMode === 'rate' ? 'rate' : 'count'} in ${monthLabel}`}
          items={sortedBoroughs.slice(0, 8).map((borough) => ({
            title: borough.name,
            subtitle: borough.dominantTypeQ4 ?? undefined,
            value:
              metricMode === 'rate'
                ? formatRate(borough[valueKey] as number | null)
                : formatInteger(borough[valueKey] as number | null),
          }))}
        />

        <article className="panel-card category-panel">
          <div className="panel-card__header">
            <h3>Top offence categories in {monthLabel}</h3>
            <span>Updates with the selected time period</span>
          </div>
          <ul className="category-bars">
            {categories.slice(0, 8).map((category) => {
              const max = Math.max(...categories.map((item) => item.count));
              return (
                <li key={category.name}>
                  <div>
                    <strong>{category.name}</strong>
                    <span>{formatCompact(category.count)}</span>
                  </div>
                  <div className="category-bars__track">
                    <div
                      className="category-bars__fill"
                      style={{ width: `${(category.count / max) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      </section>
    </div>
  );
};

export default BoroughCrimeSituationPage;
