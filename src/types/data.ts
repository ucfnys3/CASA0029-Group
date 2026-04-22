import type { FeatureCollection, Geometry } from 'geojson';

export interface BoroughProperties {
  code: string;
  name: string;
  population: number | null;
  q4Offences: number | null;
  q4Rate: number | null;
  q4Share: number | null;
  dominantTypeQ4: string | null;
  [key: string]: string | number | null;
}

export interface LsoaProperties {
  code: string;
  name: string;
  borough: string;
  crimeRate: number | null;
  crimeCount: number | null;
  population: number | null;
  unemployment: number | null;
  privateRenting: number | null;
  deprivation: number | null;
  badHealth: number | null;
  overcrowding: number | null;
  youthShare: number | null;
  populationDensity: number | null;
  newMigrantShare: number | null;
  jobDensity: number | null;
  crimeRateScore: number | null;
  unemploymentScore: number | null;
  privateRentingScore: number | null;
  deprivationScore: number | null;
  badHealthScore: number | null;
  overcrowdingScore: number | null;
  youthShareScore: number | null;
  populationDensityScore: number | null;
  priorityIndex: number | null;
  priorityBand: string;
  crimeDeprivationOverlap: number | null;
  crimeRentingOverlap: number | null;
  crimeUnemploymentOverlap: number | null;
  [key: string]: string | number | null;
}

export type BoroughGeoJson = FeatureCollection<Geometry, BoroughProperties>;
export type LsoaGeoJson = FeatureCollection<Geometry, LsoaProperties>;

export interface RankedPlace {
  code: string;
  name: string;
  borough: string;
  priorityIndex: number;
  crimeRate: number;
  unemployment: number;
  privateRenting: number;
  deprivation: number;
  badHealth: number;
  overcrowding: number;
  youthShare: number;
}

export interface OverviewMonthTotal {
  month: string;
  label: string;
  offences: number;
  positiveOutcomes: number;
}

export interface BoroughRanking {
  name: string;
  q4Offences: number | null;
  q4Rate: number | null;
  population: number | null;
  dominantTypeQ4: string | null;
}

export interface CategoryTotal {
  name: string;
  count: number;
}

export interface HomeSummary {
  q4IncidentCount: number;
  topDecileCrimeShare: number;
  lsoaCount: number;
  completeStructuralCount: number;
}

export interface OverviewSummary {
  availableMonths: Array<{ key: string; label: string }>;
  overviewCards: {
    q4Offences: number;
    q4PositiveOutcomes: number;
    boroughsMapped: number;
    topBoroughByQ4Count: string;
  };
  monthlyTotals: OverviewMonthTotal[];
  topBoroughsByQ4Count: BoroughRanking[];
  topBoroughsByQ4Rate: BoroughRanking[];
  topCategoriesQ4: CategoryTotal[];
  topCategoriesByPeriod?: Record<string, CategoryTotal[]>;
}

export interface HotspotMonthSummary {
  month: string;
  label: string;
  recordCount: number;
  topCrimeTypes: CategoryTotal[];
}

export interface HotspotSummary {
  availableMonths: Array<{ key: string; label: string }>;
  recordCountQ4: number;
  crimeTypes: string[];
  monthSummaries: HotspotMonthSummary[];
}

export interface SummaryData {
  home: HomeSummary;
  overview: OverviewSummary;
  structural: {
    topCrimeRatePlaces: Array<{
      name: string;
      borough: string;
      crimeRate: number;
      crimeCount: number;
    }>;
    priorityPlaces: RankedPlace[];
  };
  hotspots: HotspotSummary;
}

export interface ChartPoint {
  key: string;
  label: string;
  value: number;
}

export interface BoroughChangePoint {
  name: string;
  value: number;
  total2024: number;
  total2025: number;
}

export interface PoliceStrengthPoint {
  key: string;
  label: string;
  policeOfficerStrength: number;
  policeStaffStrength: number;
  pcsoStrength: number;
}

export interface BackgroundChartsData {
  recordedCrime: ChartPoint[];
  boroughChange: BoroughChangePoint[];
  policeConfidence: ChartPoint[];
  policeForceStrength: PoliceStrengthPoint[];
}

export type CompactIncidentRecord = [number, number, number, number, number];

export interface IncidentPayload {
  month: string;
  recordCount: number;
  records: CompactIncidentRecord[];
  types: string[];
  locations: string[];
  lsoas: string[];
}

export interface LsoaLookup {
  [code: string]: {
    name: string;
    borough: string;
  };
}

export interface DecodedIncident {
  lon: number;
  lat: number;
  type: string;
  location: string;
  lsoaCode: string;
  lsoaName: string;
  borough: string;
}

export interface HotspotCell {
  id: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  count: number;
  dominantType: string;
  dominantBorough: string;
  sampleIndexes: number[];
  typeCounts: Record<string, number>;
}
