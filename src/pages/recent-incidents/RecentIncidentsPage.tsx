import { useState } from 'react';
import HotspotMap from '../../components/HotspotMap';
import StatCard from '../../components/StatCard';
import Takeaway from '../../components/Takeaway';
import WheelSelector from '../../components/WheelSelector';
import { useJsonData } from '../../hooks/useJsonData';
import { decodeCellSamples, filteredIncidentCount } from '../../lib/hotspots';
import { formatCompact } from '../../lib/format';
import type {
  BoroughGeoJson,
  HotspotCell,
  IncidentPayload,
  LsoaLookup,
  SummaryData,
} from '../../types/data';

const RecentIncidentsPage = () => {
  const { data: summary, loading: summaryLoading, error: summaryError } =
    useJsonData<SummaryData>('/data/summary.json');
  const { data: lookup, loading: lookupLoading, error: lookupError } =
    useJsonData<LsoaLookup>('/data/lsoaLookup.json');
  const { data: boroughs, loading: boroughLoading, error: boroughError } =
    useJsonData<BoroughGeoJson>('/data/boroughs.geojson');
  const [selectedMonth, setSelectedMonth] = useState('2025-Q4');
  const [selectedType, setSelectedType] = useState('All crime types');
  const [selectedCell, setSelectedCell] = useState<HotspotCell | null>(null);
  const { data: payload, loading: payloadLoading, error: payloadError } =
    useJsonData<IncidentPayload>(`/data/incidents/${selectedMonth}.json`);

  const resetSelection = (nextMonth?: string, nextType?: string) => {
    setSelectedCell(null);
    if (nextMonth) {
      setSelectedMonth(nextMonth);
    }
    if (nextType) {
      setSelectedType(nextType);
    }
  };

  const filteredCount = payload && lookup ? filteredIncidentCount(payload, selectedType) : 0;
  const sampledIncidents =
    payload && lookup ? decodeCellSamples(payload, lookup, selectedCell) : [];
  const monthSummary =
    summary?.hotspots.monthSummaries.find((entry) => entry.month === selectedMonth) ?? null;
  const monthLabel =
    summary?.hotspots.availableMonths.find((item) => item.key === selectedMonth)?.label ??
    selectedMonth;

  if (summaryLoading || lookupLoading || boroughLoading || payloadLoading) {
    return <div className="shell-width page-shell">Loading recent incidents...</div>;
  }

  if (!summary || !lookup || !boroughs || !payload || summaryError || lookupError || boroughError || payloadError) {
    return (
      <div className="shell-width page-shell">
        Could not load the hotspot page. {summaryError ?? lookupError ?? boroughError ?? payloadError}
      </div>
    );
  }

  return (
    <div className="hotspot-dashboard">
      <section className="hotspot-dashboard__header">
        <div>
          <p className="borough-dashboard__kicker">Page 4 / recent incidents</p>
          <h1>Recent incidents and hotspots</h1>
          <p>
            Q4 2025 geocoded incident records are grouped into zoom-responsive hotspot cells.
            Borough boundaries are kept visible so concentrations can be read against London
            administrative geography.
          </p>
        </div>
        <div className="hotspot-dashboard__stats">
          <StatCard
            label="Records in current selection"
            value={formatCompact(filteredCount)}
            detail="Filtered from the geocoded incident files."
          />
          <StatCard
            label="Month or quarter"
            value={monthLabel}
            detail="The map updates with this period."
          />
          <StatCard
            label="Crime type"
            value={selectedType}
            detail="The filter changes visible hotspot cells."
          />
        </div>
      </section>

      <section className="hotspot-dashboard__main">
        <HotspotMap
          payload={payload}
          selectedType={selectedType}
          lookup={lookup}
          boroughs={boroughs}
          selectedCell={selectedCell}
          onSelectCell={setSelectedCell}
        />

        <div className="hotspot-dashboard__rail">
          <article className="panel-card map-control-panel">
            <p className="panel-card__eyebrow">Map controls</p>
            <h3>{monthLabel}</h3>
            <WheelSelector
              label="Month"
              value={selectedMonth}
              maxHeight={210}
              options={summary.hotspots.availableMonths.map((item) => ({
                value: item.key,
                label: item.label,
                description: item.key === '2025-Q4' ? 'Combined view' : 'Single month',
              }))}
              onChange={(value) => resetSelection(value)}
            />
            <WheelSelector
              label="Crime type"
              value={selectedType}
              maxHeight={330}
              options={[
                {
                  value: 'All crime types',
                  label: 'All crime types',
                  description: 'Full selected month or quarter',
                },
                ...summary.hotspots.crimeTypes.map((type) => ({
                  value: type,
                  label: type,
                })),
              ]}
              onChange={(value) => resetSelection(undefined, value)}
            />
          </article>

          <article className="panel-card">
            <p className="panel-card__eyebrow">How to read this layer</p>
            <h3>Hotspot cells, not raw clutter</h3>
            <p>
              Each circle stands for a hotspot cell built from the underlying geocoded incidents.
              As you zoom in, the cells tighten so the concentration pattern becomes more local.
            </p>
            <p>
              Click a cell to inspect sample incidents, the dominant type inside that cell, and
              the borough where the cell is most concentrated.
            </p>
          </article>

          <article className="panel-card">
            <p className="panel-card__eyebrow">Selected hotspot</p>
            <h3>{selectedCell ? `${selectedCell.count} incidents` : 'Choose a hotspot cell'}</h3>
            {selectedCell ? (
              <div className="metric-list">
                <div>
                  <span>Dominant type</span>
                  <strong>{selectedCell.dominantType}</strong>
                </div>
                <div>
                  <span>Dominant borough</span>
                  <strong>{selectedCell.dominantBorough}</strong>
                </div>
              </div>
            ) : (
              <p>
                The map opens without forcing a single hotspot narrative. Click any visible cell
                to inspect sample records from that concentration.
              </p>
            )}
          </article>

          <article className="panel-card">
            <div className="panel-card__header">
              <h3>Sample incidents from the selected cell</h3>
            </div>
            {sampledIncidents.length ? (
              <ul className="incident-list">
                {sampledIncidents.slice(0, 10).map((incident, index) => (
                  <li key={`${incident.location}-${index}`}>
                    <strong>{incident.type}</strong>
                    <span>{incident.location}</span>
                    <small>
                      {incident.lsoaName} / {incident.borough}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Click a hotspot cell to reveal a sample of the underlying incident records.</p>
            )}
          </article>

          {monthSummary ? (
            <article className="panel-card">
              <div className="panel-card__header">
                <h3>Month snapshot</h3>
              </div>
              <ul className="mini-list">
                {monthSummary.topCrimeTypes.map((item) => (
                  <li key={item.name}>
                    <span>{item.name}</span>
                    <strong>{formatCompact(item.count)}</strong>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      </section>

      <Takeaway
        title="Takeaway"
        text="Recent incident concentration is strongest in a limited set of central, commercial, and high-movement corridors, but the pattern is not identical across crime types."
      />
    </div>
  );
};

export default RecentIncidentsPage;
