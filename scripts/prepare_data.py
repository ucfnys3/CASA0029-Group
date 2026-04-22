from __future__ import annotations

import csv
import json
import math
import os
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = Path(
    os.environ.get("CASA0029_SOURCE_DIR", PROJECT_ROOT / "data")
)
OUTPUT_ROOT = PROJECT_ROOT / "public" / "data"
INCIDENT_OUTPUT = OUTPUT_ROOT / "incidents"


def ensure_dirs() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    INCIDENT_OUTPUT.mkdir(parents=True, exist_ok=True)


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))


def to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "")
    if text in {"", "#", "null", "None"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def round_safe(value: float | None, digits: int = 2) -> float | None:
    if value is None:
        return None
    return round(value, digits)


def load_nomis_table(path: Path) -> List[Dict[str, str]]:
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    header_index = None
    for index, line in enumerate(lines):
        if "2021 super output area - lower layer" in line or "LSOA21CD" in line:
            header_index = index
            break
    if header_index is None:
        raise ValueError(f"Could not locate table header in {path}")
    reader = csv.DictReader(lines[header_index:])
    rows: List[Dict[str, str]] = []
    for row in reader:
        if row and any((value or "").strip() for value in row.values()):
            rows.append({(key or "").strip(): (value or "").strip() for key, value in row.items()})
    return rows


def load_plain_csv(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return [
            {(key or "").strip(): (value or "").strip() for key, value in row.items()}
            for row in reader
            if row and any((value or "").strip() for value in row.values())
        ]


def quantile(values: List[float], proportion: float) -> float:
    if not values:
        raise ValueError("Cannot compute quantile for an empty series.")
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * proportion
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[int(position)]
    lower_value = ordered[lower]
    upper_value = ordered[upper]
    weight = position - lower
    return lower_value + (upper_value - lower_value) * weight


def build_lookup(rows: Iterable[Dict[str, str]], transform) -> Dict[str, float | None]:
    lookup: Dict[str, float | None] = {}
    for row in rows:
        code = row.get("mnemonic") or row.get("LSOA21CD")
        if not code:
            continue
        lookup[code] = transform(row)
    return lookup


def robust_min_max(values_by_code: Dict[str, float | None]) -> Dict[str, float | None]:
    valid_values = [value for value in values_by_code.values() if value is not None]
    if not valid_values:
        return {code: None for code in values_by_code}
    lower = quantile(valid_values, 0.05)
    upper = quantile(valid_values, 0.95)
    if math.isclose(lower, upper):
        return {code: 50.0 if value is not None else None for code, value in values_by_code.items()}

    scaled: Dict[str, float | None] = {}
    for code, value in values_by_code.items():
        if value is None:
            scaled[code] = None
            continue
        clipped = min(max(value, lower), upper)
        scaled[code] = ((clipped - lower) / (upper - lower)) * 100
    return scaled


def band_for_score(value: float) -> str:
    if value >= 85:
        return "highest"
    if value >= 70:
        return "high"
    if value >= 50:
        return "elevated"
    if value >= 30:
        return "moderate"
    return "lower"


def month_key_to_label(month_key: str) -> str:
    year = month_key[:4]
    month = int(month_key[4:])
    names = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ]
    return f"{names[month - 1]} {year}"


MONTH_NAME_TO_NUMBER = {
    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dec": 12,
}


def short_month_key(value: str) -> str:
    month_text, year_text = value.strip().split("-")
    year = 2000 + int(year_text)
    month = MONTH_NAME_TO_NUMBER[month_text]
    return f"{year}{month:02d}"


def short_month_label(value: str) -> str:
    month_text, year_text = value.strip().split("-")
    return f"{month_text} 20{year_text}"


def build_structural_geojson() -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Dict[str, str]]]:
    base_geojson = read_json(SOURCE_ROOT / "LSOA_Merged_map_with_data.geojson")

    unemployment_rows = load_nomis_table(SOURCE_ROOT / "Economic activity status lsoa.csv")
    renting_rows = load_nomis_table(SOURCE_ROOT / "Tenure and house situation lsoa.csv")
    deprivation_rows = load_nomis_table(
        SOURCE_ROOT / "Households by deprivation dimensions lsoa.csv"
    )
    health_rows = load_nomis_table(SOURCE_ROOT / "General health lsoa.csv")
    overcrowding_rows = load_nomis_table(SOURCE_ROOT / "Occupancy rating for bedrooms lsoa.csv")
    youth_rows = load_nomis_table(SOURCE_ROOT / "Age by broad age bands lsoa .csv")
    density_rows = load_nomis_table(SOURCE_ROOT / "Population density lsoa.csv")
    residents_rows = load_nomis_table(SOURCE_ROOT / "total residents lsoa.csv")

    unemployment = build_lookup(
        unemployment_rows,
        lambda row: (
            (to_float(row.get("Economically active (excluding full-time students): Unemployed")) or 0)
            + (to_float(row.get("Economically active and a full-time student: Unemployed")) or 0)
        ),
    )
    private_renting = build_lookup(renting_rows, lambda row: to_float(row.get("Private rented")))
    deprivation = build_lookup(deprivation_rows, lambda row: to_float(row.get("2021")))
    bad_health = build_lookup(
        health_rows,
        lambda row: (to_float(row.get("Bad health")) or 0)
        + (to_float(row.get("Very bad health")) or 0),
    )
    overcrowding = build_lookup(
        overcrowding_rows,
        lambda row: (to_float(row.get("Occupancy rating of bedrooms: -1")) or 0)
        + (to_float(row.get("Occupancy rating of bedrooms: -2 or less")) or 0),
    )
    youth_share = build_lookup(
        youth_rows,
        lambda row: (to_float(row.get("Aged 16 to 19 years")) or 0)
        + (to_float(row.get("Aged 20 to 24 years")) or 0),
    )
    population_density = build_lookup(density_rows, lambda row: to_float(row.get("2021")))
    total_residents = build_lookup(residents_rows, lambda row: to_float(row.get("2021")))

    raw_metrics: Dict[str, Dict[str, float | None]] = {
        "crimeRate": {},
        "unemployment": {},
        "privateRenting": {},
        "deprivation": {},
        "badHealth": {},
        "overcrowding": {},
        "youthShare": {},
        "populationDensity": {},
    }

    lsoa_lookup: Dict[str, Dict[str, str]] = {}
    borough_population: Dict[str, float] = defaultdict(float)
    runtime_features: List[Dict[str, Any]] = []

    for feature in base_geojson["features"]:
        props = feature["properties"]
        code = props.get("LSOA11CD")
        name = props.get("LSOA_Name") or props.get("LSOA11NM")
        borough_name = props.get("LAD11NM")
        crime_rate = to_float(props.get("Crime_Rate"))
        crime_count = to_float(props.get("Total_Crime_Count"))
        population = total_residents.get(code) or to_float(props.get("Population")) or to_float(
            props.get("USUALRES")
        )

        runtime_props = {
            "code": code,
            "name": name,
            "borough": borough_name,
            "crimeRate": round_safe(crime_rate, 2),
            "crimeCount": round_safe(crime_count, 0),
            "population": round_safe(population, 0),
            "unemployment": round_safe(
                unemployment.get(code) if unemployment.get(code) is not None else to_float(props.get("pct_unemployed")),
                2,
            ),
            "privateRenting": round_safe(
                private_renting.get(code)
                if private_renting.get(code) is not None
                else to_float(props.get("pct_private_rented")),
                2,
            ),
            "deprivation": round_safe(
                deprivation.get(code)
                if deprivation.get(code) is not None
                else to_float(props.get("pct_deprived")),
                2,
            ),
            "badHealth": round_safe(
                bad_health.get(code)
                if bad_health.get(code) is not None
                else to_float(props.get("pct_bad_health")),
                2,
            ),
            "overcrowding": round_safe(
                overcrowding.get(code)
                if overcrowding.get(code) is not None
                else to_float(props.get("pct_overcrowded")),
                2,
            ),
            "youthShare": round_safe(
                youth_share.get(code)
                if youth_share.get(code) is not None
                else (
                    (
                        to_float(props.get("pct_16_19")) + to_float(props.get("pct_20_24"))
                    )
                    if to_float(props.get("pct_16_19")) is not None
                    and to_float(props.get("pct_20_24")) is not None
                    else None
                ),
                2,
            ),
            "populationDensity": round_safe(
                population_density.get(code)
                if population_density.get(code) is not None
                else to_float(props.get("Pop_Density")),
                2,
            ),
            "newMigrantShare": round_safe(to_float(props.get("pct_new_migrant")), 2),
            "jobDensity": round_safe(to_float(props.get("Job_Density")), 2),
        }

        lsoa_lookup[code] = {"name": name, "borough": borough_name}
        if population is not None and borough_name:
            borough_population[borough_name] += population

        for key in raw_metrics:
            raw_metrics[key][code] = runtime_props.get(key)

        runtime_features.append(
            {
                "type": "Feature",
                "geometry": feature["geometry"],
                "properties": runtime_props,
            }
        )

    scaled_metrics = {key: robust_min_max(series) for key, series in raw_metrics.items()}
    index_fields = [
        "crimeRate",
        "unemployment",
        "privateRenting",
        "deprivation",
        "badHealth",
        "overcrowding",
        "youthShare",
    ]

    ranked_places: List[Dict[str, Any]] = []
    for feature in runtime_features:
        props = feature["properties"]
        code = props["code"]
        for metric_key, scaled_lookup in scaled_metrics.items():
            props[f"{metric_key}Score"] = round_safe(scaled_lookup.get(code), 2)

        score_values = [props.get(f"{metric}Score") for metric in index_fields]
        priority_index = (
            sum(score_values) / len(score_values)
            if all(value is not None for value in score_values)
            else None
        )
        props["priorityIndex"] = round_safe(priority_index, 2)
        props["priorityBand"] = band_for_score(priority_index) if priority_index is not None else "no-data"
        props["crimeDeprivationOverlap"] = round_safe(
            (
                (props["crimeRateScore"] + props["deprivationScore"]) / 2
                if props.get("crimeRateScore") is not None and props.get("deprivationScore") is not None
                else None
            ),
            2,
        )
        props["crimeRentingOverlap"] = round_safe(
            (
                (props["crimeRateScore"] + props["privateRentingScore"]) / 2
                if props.get("crimeRateScore") is not None and props.get("privateRentingScore") is not None
                else None
            ),
            2,
        )
        props["crimeUnemploymentOverlap"] = round_safe(
            (
                (props["crimeRateScore"] + props["unemploymentScore"]) / 2
                if props.get("crimeRateScore") is not None and props.get("unemploymentScore") is not None
                else None
            ),
            2,
        )
        ranked_places.append(
            {
                "code": props["code"],
                "name": props["name"],
                "borough": props["borough"],
                "priorityIndex": props["priorityIndex"],
                "crimeRate": props["crimeRate"],
                "unemployment": props["unemployment"],
                "privateRenting": props["privateRenting"],
                "deprivation": props["deprivation"],
                "badHealth": props["badHealth"],
                "overcrowding": props["overcrowding"],
                "youthShare": props["youthShare"],
            }
        )

    ranked_places = [
        row for row in ranked_places if row["priorityIndex"] is not None and row["name"] and row["borough"]
    ]
    ranked_places.sort(key=lambda row: row["priorityIndex"], reverse=True)

    structural_geojson = {"type": "FeatureCollection", "features": runtime_features}

    summary_rows = [
        feature["properties"]
        for feature in runtime_features
        if feature["properties"]["crimeCount"] is not None
        and feature["properties"]["crimeRate"] is not None
        and feature["properties"]["name"]
        and feature["properties"]["borough"]
    ]
    summary_rows.sort(key=lambda row: row["crimeRate"], reverse=True)
    top_decile_count = max(1, len(summary_rows) // 10)
    top_decile = summary_rows[:top_decile_count]
    top_decile_share = (
        sum(row["crimeCount"] for row in top_decile) / sum(row["crimeCount"] for row in summary_rows)
    ) * 100

    structural_summary = {
        "lsoaCount": len(runtime_features),
        "completeStructuralCount": len(
            [
                feature
                for feature in runtime_features
                if all(feature["properties"].get(field) is not None for field in index_fields)
            ]
        ),
        "topDecileCrimeShare": round(top_decile_share, 2),
        "topCrimeRatePlaces": [
            {
                "name": row["name"],
                "borough": row["borough"],
                "crimeRate": row["crimeRate"],
                "crimeCount": row["crimeCount"],
            }
            for row in summary_rows[:8]
        ],
        "priorityPlaces": ranked_places[:15],
    }

    return structural_geojson, {"boroughPopulation": borough_population, **structural_summary}, lsoa_lookup


def build_borough_assets(
    borough_population: Dict[str, float], lsoa_lookup: Dict[str, Dict[str, str]]
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Dict[str, int]]]:
    borough_geojson = read_json(SOURCE_ROOT / "Final_Borough_Map.geojson")
    flexible = read_json(SOURCE_ROOT / "london_crimes_2025_flexible.json")

    borough_month_totals: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    borough_positive_outcomes: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    month_totals: Dict[str, float] = defaultdict(float)
    month_positive_outcomes: Dict[str, float] = defaultdict(float)
    type_totals_by_period: Dict[str, Counter[str]] = defaultdict(Counter)
    type_totals_q4: Counter[str] = Counter()
    area_type_q4: Dict[str, Counter[str]] = defaultdict(Counter)

    for record in flexible:
        month = record["month"].replace("-", "")
        area = record["area"]
        count = float(record["count"])
        measure = record["Measure"]
        if measure == "Offences":
            type_label = record["type"].title()
            borough_month_totals[area][month] += count
            month_totals[month] += count
            type_totals_by_period[month][type_label] += count
            if month.startswith("2025") and month[4:] in {"09", "10", "11", "12"}:
                type_totals_q4[type_label] += count
                type_totals_by_period["q4"][type_label] += count
                area_type_q4[area][type_label] += count
        elif measure == "Positive Outcomes":
            borough_positive_outcomes[area][month] += count
            month_positive_outcomes[month] += count

    q4_months = ["202509", "202510", "202511", "202512"]
    q4_total = sum(month_totals[month] for month in q4_months)

    runtime_features: List[Dict[str, Any]] = []
    borough_rankings: List[Dict[str, Any]] = []
    for feature in borough_geojson["features"]:
        props = feature["properties"]
        name = props["NAME"]
        population = borough_population.get(name)
        q4_offences = sum(to_float(props.get(month)) or 0 for month in q4_months)
        q4_rate = (q4_offences / population * 1000) if population else None

        runtime_props: Dict[str, Any] = {
            "code": props["GSS_CODE"],
            "name": name,
            "population": round_safe(population, 0),
            "q4Offences": round_safe(q4_offences, 0),
            "q4Rate": round_safe(q4_rate, 2),
            "q4Share": round_safe((q4_offences / q4_total) * 100 if q4_total else None, 2),
            "dominantTypeQ4": area_type_q4[name].most_common(1)[0][0] if area_type_q4[name] else None,
        }

        for month_key, count in borough_month_totals[name].items():
            runtime_props[f"count_{month_key}"] = round_safe(count, 0)
            rate = (count / population * 1000) if population else None
            runtime_props[f"rate_{month_key}"] = round_safe(rate, 2)
            runtime_props[f"outcomes_{month_key}"] = round_safe(
                borough_positive_outcomes[name].get(month_key), 0
            )

        runtime_features.append(
            {"type": "Feature", "geometry": feature["geometry"], "properties": runtime_props}
        )
        borough_rankings.append(
            {
                "name": name,
                "q4Offences": runtime_props["q4Offences"],
                "q4Rate": runtime_props["q4Rate"],
                "population": runtime_props["population"],
                "dominantTypeQ4": runtime_props["dominantTypeQ4"],
            }
        )

    borough_rankings.sort(key=lambda row: row["q4Offences"] or 0, reverse=True)
    rate_rankings = sorted(
        [row for row in borough_rankings if row["q4Rate"] is not None],
        key=lambda row: row["q4Rate"],
        reverse=True,
    )

    overview = {
        "availableMonths": [
            {"key": month, "label": month_key_to_label(month)}
            for month in sorted(month_totals.keys())
            if month.startswith("2025")
        ],
        "overviewCards": {
            "q4Offences": int(q4_total),
            "q4PositiveOutcomes": int(sum(month_positive_outcomes[month] for month in q4_months)),
            "boroughsMapped": len(runtime_features),
            "topBoroughByQ4Count": borough_rankings[0]["name"],
        },
        "monthlyTotals": [
            {
                "month": month,
                "label": month_key_to_label(month),
                "offences": int(month_totals[month]),
                "positiveOutcomes": int(month_positive_outcomes.get(month, 0)),
            }
            for month in sorted(month_totals.keys())
            if month.startswith("2025")
        ],
        "topBoroughsByQ4Count": borough_rankings[:10],
        "topBoroughsByQ4Rate": rate_rankings[:10],
        "topCategoriesQ4": [
            {"name": category, "count": int(count)}
            for category, count in type_totals_q4.most_common(10)
        ],
        "topCategoriesByPeriod": {
            period: [
                {"name": category, "count": int(count)}
                for category, count in counter.most_common(10)
            ]
            for period, counter in type_totals_by_period.items()
            if period == "q4" or period.startswith("2025")
        },
    }

    return {"type": "FeatureCollection", "features": runtime_features}, overview, {}


def build_incident_assets(lsoa_lookup: Dict[str, Dict[str, str]]) -> Dict[str, Any]:
    month_directory_candidates = list(SOURCE_ROOT.glob("monthly_data_clean*"))
    if not month_directory_candidates:
        raise FileNotFoundError("Could not locate the Q4 monthly incident directory.")
    month_directory = month_directory_candidates[0]

    month_files = sorted(month_directory.glob("London_Crime_2025-*.geojson"))
    all_records: List[List[Any]] = []
    all_locations: List[str] = []
    location_to_index: Dict[str, int] = {}
    all_lsoas: List[str] = []
    lsoa_to_index: Dict[str, int] = {}
    all_types: List[str] = []
    type_to_index: Dict[str, int] = {}
    month_summaries: List[Dict[str, Any]] = []

    def location_index(value: str) -> int:
        if value not in location_to_index:
            location_to_index[value] = len(all_locations)
            all_locations.append(value)
        return location_to_index[value]

    def lsoa_index(value: str) -> int:
        if value not in lsoa_to_index:
            lsoa_to_index[value] = len(all_lsoas)
            all_lsoas.append(value)
        return lsoa_to_index[value]

    def type_index(value: str) -> int:
        if value not in type_to_index:
            type_to_index[value] = len(all_types)
            all_types.append(value)
        return type_to_index[value]

    for month_file in month_files:
        raw = read_json(month_file)
        compact_records: List[List[Any]] = []
        category_counter: Counter[str] = Counter()
        for feature in raw["features"]:
            props = feature["properties"]
            lon = round(to_float(props.get("Longitude")) or 0, 6)
            lat = round(to_float(props.get("Latitude")) or 0, 6)
            crime_type = props.get("Crime type") or "Unspecified"
            location = props.get("Location") or "Location withheld"
            lsoa_code = props.get("LSOA code") or ""

            record = [
                lon,
                lat,
                type_index(crime_type),
                location_index(location),
                lsoa_index(lsoa_code),
            ]
            compact_records.append(record)
            all_records.append(record)
            category_counter[crime_type] += 1

        month_payload = {
            "month": month_file.stem.replace("London_Crime_", ""),
            "recordCount": len(compact_records),
            "records": compact_records,
            "types": all_types,
            "locations": all_locations,
            "lsoas": all_lsoas,
        }
        write_json(INCIDENT_OUTPUT / f"{month_payload['month']}.json", month_payload)
        month_summaries.append(
            {
                "month": month_payload["month"],
                "label": month_payload["month"].replace("-", " "),
                "recordCount": len(compact_records),
                "topCrimeTypes": [
                    {"name": crime_type, "count": count}
                    for crime_type, count in category_counter.most_common(6)
                ],
            }
        )

    q4_payload = {
        "month": "2025-Q4",
        "recordCount": len(all_records),
        "records": all_records,
        "types": all_types,
        "locations": all_locations,
        "lsoas": all_lsoas,
    }
    write_json(INCIDENT_OUTPUT / "2025-Q4.json", q4_payload)

    lsoa_annotation = {
        code: {"name": details.get("name"), "borough": details.get("borough")}
        for code, details in lsoa_lookup.items()
    }
    write_json(OUTPUT_ROOT / "lsoaLookup.json", lsoa_annotation)

    return {
        "availableMonths": [
            {"key": "2025-Q4", "label": "Full Quarter (Sep-Dec)"}
        ]
        + [
            {"key": entry["month"], "label": entry["month"].replace("-", " ")}
            for entry in month_summaries
        ],
        "recordCountQ4": q4_payload["recordCount"],
        "crimeTypes": all_types,
        "monthSummaries": month_summaries,
    }


def build_background_chart_assets() -> Dict[str, Any]:
    borough_geojson = read_json(SOURCE_ROOT / "Final_Borough_Map.geojson")
    month_keys = sorted(
        key
        for key in borough_geojson["features"][0]["properties"]
        if key.startswith("2024") or key.startswith("2025")
    )

    recorded_crime = []
    for month_key in month_keys:
        total = sum(
            to_float(feature["properties"].get(month_key)) or 0
            for feature in borough_geojson["features"]
        )
        recorded_crime.append(
            {
                "key": month_key,
                "label": month_key_to_label(month_key),
                "value": int(total),
            }
        )

    borough_change = []
    for feature in borough_geojson["features"]:
        props = feature["properties"]
        total_2024 = sum(to_float(props.get(f"2024{month:02d}")) or 0 for month in range(1, 13))
        total_2025 = sum(to_float(props.get(f"2025{month:02d}")) or 0 for month in range(1, 13))
        change = ((total_2025 - total_2024) / total_2024) * 100 if total_2024 else None
        if change is not None:
            borough_change.append(
                {
                    "name": props["NAME"],
                    "value": round(change, 2),
                    "total2024": int(total_2024),
                    "total2025": int(total_2025),
                }
            )
    borough_change.sort(key=lambda item: item["value"])

    confidence_rows = load_plain_csv(SOURCE_ROOT / "public-perception-data.csv")
    confidence_measure = "Police do a good job in the local area"
    confidence = [
        {
            "key": short_month_key(row["date"]),
            "label": short_month_label(row["date"]),
            "value": round_safe(to_float(row["proportion"]), 1),
        }
        for row in confidence_rows
        if row.get("measure") == confidence_measure and to_float(row.get("proportion")) is not None
    ]
    confidence.sort(key=lambda item: item["key"])

    strength_rows = load_plain_csv(SOURCE_ROOT / "Police_Force_Strength.csv")
    police_strength = []
    for row in strength_rows:
        officer = to_float(row.get("Police Officer Strength"))
        staff = to_float(row.get("Police Staff Strength"))
        pcso = to_float(row.get("PCSO Strength"))
        if officer is None or staff is None or pcso is None:
            continue
        police_strength.append(
            {
                "key": short_month_key(row["Date"]),
                "label": short_month_label(row["Date"]),
                "policeOfficerStrength": int(officer),
                "policeStaffStrength": int(staff),
                "pcsoStrength": int(pcso),
            }
        )
    police_strength.sort(key=lambda item: item["key"])

    return {
        "recordedCrime": recorded_crime,
        "boroughChange": borough_change,
        "policeConfidence": confidence,
        "policeForceStrength": police_strength,
    }


def main() -> None:
    ensure_dirs()
    structural_geojson, structural_summary, lsoa_lookup = build_structural_geojson()
    borough_geojson, overview_summary, _ = build_borough_assets(
        structural_summary["boroughPopulation"], lsoa_lookup
    )
    hotspot_summary = build_incident_assets(lsoa_lookup)
    background_charts = build_background_chart_assets()

    write_json(OUTPUT_ROOT / "lsoa.geojson", structural_geojson)
    write_json(OUTPUT_ROOT / "boroughs.geojson", borough_geojson)
    write_json(OUTPUT_ROOT / "backgroundCharts.json", background_charts)
    write_json(
        OUTPUT_ROOT / "summary.json",
        {
            "home": {
                "q4IncidentCount": hotspot_summary["recordCountQ4"],
                "topDecileCrimeShare": structural_summary["topDecileCrimeShare"],
                "lsoaCount": structural_summary["lsoaCount"],
                "completeStructuralCount": structural_summary["completeStructuralCount"],
            },
            "overview": overview_summary,
            "structural": {
                "topCrimeRatePlaces": structural_summary["topCrimeRatePlaces"],
                "priorityPlaces": structural_summary["priorityPlaces"],
            },
            "hotspots": hotspot_summary,
        },
    )

    print(f"Prepared runtime data in {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()
