import RadarChart, { type RadarAxis } from './RadarChart';
import { ARCHETYPE_META, type ArchetypeKey } from '../lib/colors';
import type { LsoaProperties } from '../types/data';

const radarAxes: RadarAxis[] = [
  { key: 'unemploymentScore',   label: 'Unemployment', shortLabel: 'Unemp.' },
  { key: 'privateRentingScore', label: 'Renting',      shortLabel: 'Rent' },
  { key: 'deprivationScore',    label: 'Deprivation',  shortLabel: 'Deprv.' },
  { key: 'badHealthScore',      label: 'Bad health',   shortLabel: 'Health' },
  { key: 'overcrowdingScore',   label: 'Overcrowd',    shortLabel: 'Crowd' },
  { key: 'youthShareScore',     label: 'Youth 16–24',  shortLabel: 'Youth' },
];

type ArchetypeCardProps = {
  archetype: ArchetypeKey;
  members: LsoaProperties[];
  onSelectLsoa?: (lsoa: LsoaProperties) => void;
  isActive?: boolean;
  onToggle?: () => void;
};

const computeAverageProfile = (members: LsoaProperties[]): Record<string, number> => {
  if (!members.length) return {};
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  radarAxes.forEach((axis) => {
    members.forEach((member) => {
      const value = member[axis.key];
      if (typeof value === 'number') {
        sums[axis.key] = (sums[axis.key] ?? 0) + value;
        counts[axis.key] = (counts[axis.key] ?? 0) + 1;
      }
    });
  });
  const averages: Record<string, number> = {};
  radarAxes.forEach((axis) => {
    if (counts[axis.key]) {
      averages[axis.key] = sums[axis.key] / counts[axis.key];
    }
  });
  return averages;
};

const ArchetypeCard = ({
  archetype,
  members,
  onSelectLsoa,
  isActive,
  onToggle,
}: ArchetypeCardProps) => {
  const meta = ARCHETYPE_META[archetype];
  const profile = computeAverageProfile(members);

  const representative = [...members]
    .sort(
      (a, b) =>
        (b.compositeVulnerabilityScore ?? 0) - (a.compositeVulnerabilityScore ?? 0),
    )
    .slice(0, 3);

  return (
    <div
      className={`archetype-card${isActive ? ' active' : ''}`}
      onClick={onToggle}
      role={onToggle ? 'button' : undefined}
      tabIndex={onToggle ? 0 : undefined}
    >
      <div className="archetype-card__header">
        <span
          className="archetype-card__swatch"
          style={{ backgroundColor: meta.color }}
          aria-hidden="true"
        />
        <div>
          <h4 className="archetype-card__title">{meta.label}</h4>
          <p className="archetype-card__count">{members.length} LSOAs</p>
        </div>
      </div>

      <div className="archetype-card__radar">
        <RadarChart
          axes={radarAxes}
          values={profile}
          size={160}
          useShortLabels
          ariaLabel={`${meta.label} average profile`}
        />
      </div>

      <p className="archetype-card__framing">{meta.framing}</p>

      <div className="archetype-card__section-label">Representative LSOAs</div>
      <ul className="archetype-card__list">
        {representative.map((lsoa) => (
          <li key={lsoa.code}>
            <button
              type="button"
              className="archetype-card__lsoa-btn"
              onClick={(event) => {
                event.stopPropagation();
                onSelectLsoa?.(lsoa);
              }}
            >
              <strong>{lsoa.name}</strong>
              <small>{lsoa.borough}</small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ArchetypeCard;
