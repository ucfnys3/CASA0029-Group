import type {
  CompactIncidentRecord,
  DecodedIncident,
  HotspotCell,
  IncidentPayload,
  LsoaLookup,
} from '../types/data';

type BoundsLike = {
  getWest(): number;
  getEast(): number;
  getSouth(): number;
  getNorth(): number;
};

const cellSizeForZoom = (zoom: number) => {
  if (zoom >= 14) return 0.003;
  if (zoom >= 13) return 0.0045;
  if (zoom >= 12) return 0.006;
  if (zoom >= 11) return 0.009;
  if (zoom >= 10) return 0.022;
  return 0.04;
};

const cellLimitForZoom = (zoom: number) => {
  if (zoom >= 13) return 520;
  if (zoom >= 12) return 420;
  if (zoom >= 11) return 300;
  if (zoom >= 10) return 190;
  return 130;
};

const expandBounds = (bounds: BoundsLike) => ({
  west: bounds.getWest() - 0.02,
  east: bounds.getEast() + 0.02,
  south: bounds.getSouth() - 0.02,
  north: bounds.getNorth() + 0.02,
});

export const filteredIncidentCount = (
  payload: IncidentPayload,
  selectedType: string,
) => {
  if (selectedType === 'All crime types') {
    return payload.recordCount;
  }
  const typeIndex = payload.types.indexOf(selectedType);
  if (typeIndex === -1) {
    return 0;
  }
  return payload.records.reduce(
    (count, record) => count + (record[2] === typeIndex ? 1 : 0),
    0,
  );
};

export const buildHotspotCells = (
  payload: IncidentPayload,
  selectedType: string,
  lookup: LsoaLookup,
  bounds: BoundsLike | null,
  zoom: number,
) => {
  const typeIndex =
    selectedType === 'All crime types' ? null : payload.types.indexOf(selectedType);
  const visibleBounds = bounds ? expandBounds(bounds) : null;
  const cellSize = cellSizeForZoom(zoom);
  const aggregation = new Map<
    string,
    {
      count: number;
      lonSum: number;
      latSum: number;
      sampleIndexes: number[];
      typeCounts: Map<string, number>;
      boroughCounts: Map<string, number>;
      west: number;
      south: number;
      east: number;
      north: number;
    }
  >();

  payload.records.forEach((record, index) => {
    if (typeIndex !== null && record[2] !== typeIndex) {
      return;
    }

    const [lon, lat] = record;
    if (
      visibleBounds &&
      (lon < visibleBounds.west ||
        lon > visibleBounds.east ||
        lat < visibleBounds.south ||
        lat > visibleBounds.north)
    ) {
      return;
    }

    const x = Math.floor(lon / cellSize);
    const y = Math.floor(lat / cellSize);
    const key = `${x}:${y}`;
    const west = x * cellSize;
    const south = y * cellSize;
    const east = west + cellSize;
    const north = south + cellSize;
    const lsoaCode = payload.lsoas[record[4]];
    const typeLabel = payload.types[record[2]];
    const borough = lookup[lsoaCode]?.borough ?? 'Unmatched LSOA';

    if (!aggregation.has(key)) {
      aggregation.set(key, {
        count: 0,
        lonSum: 0,
        latSum: 0,
        sampleIndexes: [],
        typeCounts: new Map(),
        boroughCounts: new Map(),
        west,
        south,
        east,
        north,
      });
    }

    const bucket = aggregation.get(key)!;
    bucket.count += 1;
    bucket.lonSum += lon;
    bucket.latSum += lat;
    if (bucket.sampleIndexes.length < 22) {
      bucket.sampleIndexes.push(index);
    }
    bucket.typeCounts.set(typeLabel, (bucket.typeCounts.get(typeLabel) ?? 0) + 1);
    bucket.boroughCounts.set(borough, (bucket.boroughCounts.get(borough) ?? 0) + 1);
  });

  const cells: HotspotCell[] = Array.from(aggregation.entries())
    .map(([id, bucket]) => {
      const dominantType =
        Array.from(bucket.typeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
        'Mixed';
      const dominantBorough =
        Array.from(bucket.boroughCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
        'Unmatched';
      return {
        id,
        center: [bucket.latSum / bucket.count, bucket.lonSum / bucket.count] as [number, number],
        bounds: [
          [bucket.south, bucket.west],
          [bucket.north, bucket.east],
        ] as [[number, number], [number, number]],
        count: bucket.count,
        dominantType,
        dominantBorough,
        sampleIndexes: bucket.sampleIndexes,
      };
    })
    .sort((a, b) => b.count - a.count);

  return cells.slice(0, cellLimitForZoom(zoom));
};

export const decodeIncident = (
  payload: IncidentPayload,
  lookup: LsoaLookup,
  record: CompactIncidentRecord,
): DecodedIncident => {
  const lsoaCode = payload.lsoas[record[4]];
  return {
    lon: record[0],
    lat: record[1],
    type: payload.types[record[2]],
    location: payload.locations[record[3]],
    lsoaCode,
    lsoaName: lookup[lsoaCode]?.name ?? lsoaCode,
    borough: lookup[lsoaCode]?.borough ?? 'Unmatched LSOA',
  };
};

export const decodeCellSamples = (
  payload: IncidentPayload,
  lookup: LsoaLookup,
  cell: HotspotCell | null,
) => {
  if (!cell) {
    return [];
  }

  return cell.sampleIndexes.map((index) =>
    decodeIncident(payload, lookup, payload.records[index]),
  );
};
