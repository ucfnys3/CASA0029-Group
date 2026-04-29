from __future__ import annotations

import csv
import json
import math
import os
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import numpy as np


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = Path(
    os.environ.get("CASA0029_SOURCE_DIR", PROJECT_ROOT / "data")
)
OUTPUT_ROOT = PROJECT_ROOT / "public" / "data"
INCIDENT_OUTPUT = OUTPUT_ROOT / "incidents"
LONDON_LSOA_2021_BOUNDARY_FILE = "London_LSOA_2021_Boundaries.geojson"
LSOA_2021_BOUNDARY_GLOB = (
    "Lower_layer_Super_Output_Areas_December_2021_Boundaries_EW_BSC*.geojson"
)


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


def is_lsoa_code(value: Any) -> bool:
    text = str(value or "").strip()
    return len(text) == 9 and text.startswith("E") and text[1:].isdigit()


def load_lsoa_2021_boundaries() -> Dict[str, Any]:
    candidates = sorted(SOURCE_ROOT.glob(LSOA_2021_BOUNDARY_GLOB))
    if not candidates:
        raise FileNotFoundError(
            f"Could not locate the 2021 LSOA boundary GeoJSON matching {LSOA_2021_BOUNDARY_GLOB}"
        )
    return read_json(candidates[0])


def is_city_of_london_lsoa(properties: Dict[str, Any]) -> bool:
    name = str(properties.get("LSOA21NM") or "")
    return name.startswith("City of London")


def load_london_lsoa_2021_boundaries(london_lsoa_codes: set[str]) -> Dict[str, Any]:
    london_path = SOURCE_ROOT / LONDON_LSOA_2021_BOUNDARY_FILE
    if london_path.exists():
        return read_json(london_path)

    source_geojson = load_lsoa_2021_boundaries()
    london_features = []
    for feature in source_geojson["features"]:
        properties = feature.get("properties", {})
        code = properties.get("LSOA21CD")
        if code in london_lsoa_codes or is_city_of_london_lsoa(properties):
            london_features.append(feature)

    london_geojson = {
        "type": "FeatureCollection",
        "crs": source_geojson.get("crs"),
        "features": london_features,
    }
    write_json(london_path, london_geojson)
    return london_geojson


def load_borough_name_lookup() -> Dict[str, str]:
    borough_geojson = read_json(SOURCE_ROOT / "Final_Borough_Map.geojson")
    return {
        feature["properties"]["GSS_CODE"]: feature["properties"]["NAME"]
        for feature in borough_geojson["features"]
        if feature.get("properties", {}).get("GSS_CODE")
    }


def load_lsoa_crime_lookup() -> Dict[str, Dict[str, Any]]:
    borough_names = load_borough_name_lookup()
    rows = load_plain_csv(SOURCE_ROOT / "LSOA_Crime_Rate_2021_With_Names.csv")
    lookup: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        code = row.get("LSOA Code")
        if not is_lsoa_code(code):
            continue
        borough_code = row.get("Borough")
        lookup[code] = {
            "name": row.get("LSOA Name"),
            "boroughCode": borough_code,
            "boroughName": borough_names.get(borough_code or "", borough_code),
            "crimeCount": to_float(row.get("Total_Crime_Count")),
            "population": to_float(row.get("Population")),
            "crimeRate": to_float(row.get("Crime_Rate")),
        }
    return lookup


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
        if not is_lsoa_code(code):
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
    crime_lookup = load_lsoa_crime_lookup()
    london_lsoa_codes = set(crime_lookup)
    base_geojson = load_london_lsoa_2021_boundaries(london_lsoa_codes)

    unemployment_rows = load_nomis_table(SOURCE_ROOT / "Economic activity status lsoa.csv")
    renting_rows = load_nomis_table(SOURCE_ROOT / "Tenure and house situation lsoa.csv")
    deprivation_rows = load_nomis_table(
        SOURCE_ROOT / "Households by deprivation dimensions lsoa.csv"
    )
    qualification_rows = load_nomis_table(SOURCE_ROOT / "Highest level of qualification lsoa.csv")
    migrant_rows = load_nomis_table(SOURCE_ROOT / "Migrant Indicator lsoa.csv")
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
    no_qualifications = build_lookup(
        qualification_rows,
        lambda row: to_float(row.get("No qualifications")),
    )
    recent_migration = build_lookup(
        migrant_rows,
        lambda row: to_float(row.get("sum_migration")),
    )
    youth_share = build_lookup(
        youth_rows,
        lambda row: to_float(row.get("Aged 20 to 24 years")),
    )
    population_density = build_lookup(density_rows, lambda row: to_float(row.get("2021")))
    total_residents = build_lookup(residents_rows, lambda row: to_float(row.get("2021")))

    raw_metrics: Dict[str, Dict[str, float | None]] = {
        "crimeRate": {},
        "unemployment": {},
        "privateRenting": {},
        "deprivation": {},
        "noQualifications": {},
        "recentMigration": {},
        "youthShare": {},
        "populationDensity": {},
    }

    lsoa_lookup: Dict[str, Dict[str, str]] = {}
    borough_population: Dict[str, float] = defaultdict(float)
    runtime_features: List[Dict[str, Any]] = []

    for feature in base_geojson["features"]:
        props = feature["properties"]
        code = props.get("LSOA21CD")
        if not is_lsoa_code(code):
            continue

        name = props.get("LSOA21NM")

        # The source boundary file is England/Wales-wide.  The crime-rate file is
        # already a London 2021 LSOA extract, so it is the safest London mask.
        if code not in london_lsoa_codes:
            if name and str(name).startswith("City of London"):
                lsoa_lookup[code] = {"name": name, "borough": "City of London"}
            continue

        crime_record = crime_lookup[code]
        borough_name = crime_record.get("boroughName")
        crime_rate = to_float(crime_record.get("crimeRate"))
        crime_count = to_float(crime_record.get("crimeCount"))
        population = total_residents.get(code) or to_float(crime_record.get("population"))

        runtime_props = {
            "code": code,
            "name": name or crime_record.get("name"),
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
            "noQualifications": round_safe(
                no_qualifications.get(code)
                if no_qualifications.get(code) is not None
                else None,
                2,
            ),
            "recentMigration": round_safe(
                recent_migration.get(code)
                if recent_migration.get(code) is not None
                else None,
                2,
            ),
            "youthShare": round_safe(
                youth_share.get(code)
                if youth_share.get(code) is not None
                else to_float(props.get("pct_20_24")),
                2,
            ),
            "populationDensity": round_safe(
                population_density.get(code)
                if population_density.get(code) is not None
                else None,
                2,
            ),
            "newMigrantShare": None,
            "jobDensity": None,
        }

        lsoa_lookup[code] = {
            "name": runtime_props["name"],
            "borough": runtime_props["borough"],
        }
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
        "noQualifications",
        "recentMigration",
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

        composite_fields = [
            "unemployment",
            "privateRenting",
            "deprivation",
            "noQualifications",
            "recentMigration",
            "youthShare",
        ]
        composite_values = [props.get(f"{metric}Score") for metric in composite_fields]
        composite_vulnerability = (
            sum(composite_values) / len(composite_values)
            if all(value is not None for value in composite_values)
            else None
        )
        props["compositeVulnerabilityScore"] = round_safe(composite_vulnerability, 2)
        props["compositeVulnerabilityBand"] = (
            band_for_score(composite_vulnerability)
            if composite_vulnerability is not None
            else "no-data"
        )

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
                "noQualifications": props["noQualifications"],
                "recentMigration": props["recentMigration"],
                "youthShare": props["youthShare"],
            }
        )

    ranked_places = [
        row for row in ranked_places if row["priorityIndex"] is not None and row["name"] and row["borough"]
    ]
    ranked_places.sort(key=lambda row: row["priorityIndex"], reverse=True)

    def _tertile_bin(value: float | None, thresholds: Tuple[float, float]) -> int | None:
        if value is None:
            return None
        low, high = thresholds
        if value < low:
            return 0
        if value < high:
            return 1
        return 2

    def _tertile_thresholds(values: List[float]) -> Tuple[float, float]:
        if not values:
            return (0.0, 0.0)
        sorted_values = sorted(values)
        n = len(sorted_values)
        def _quantile(q: float) -> float:
            pos = q * (n - 1)
            lower = int(math.floor(pos))
            upper = int(math.ceil(pos))
            if lower == upper:
                return sorted_values[lower]
            frac = pos - lower
            return sorted_values[lower] * (1 - frac) + sorted_values[upper] * frac
        return (_quantile(1 / 3), _quantile(2 / 3))

    crime_score_values = [
        props["crimeRateScore"]
        for feature in runtime_features
        for props in [feature["properties"]]
        if props.get("crimeRateScore") is not None
        and props.get("compositeVulnerabilityScore") is not None
    ]
    vuln_score_values = [
        props["compositeVulnerabilityScore"]
        for feature in runtime_features
        for props in [feature["properties"]]
        if props.get("crimeRateScore") is not None
        and props.get("compositeVulnerabilityScore") is not None
    ]
    crime_thresholds = _tertile_thresholds(crime_score_values)
    vuln_thresholds = _tertile_thresholds(vuln_score_values)

    for feature in runtime_features:
        props = feature["properties"]
        crime_score = props.get("crimeRateScore")
        vuln_score = props.get("compositeVulnerabilityScore")
        crime_bin = _tertile_bin(crime_score, crime_thresholds)
        vuln_bin = _tertile_bin(vuln_score, vuln_thresholds)
        props["bivariateCrimeBin"] = crime_bin
        props["bivariateVulnBin"] = vuln_bin
        props["bivariateBin"] = (
            crime_bin * 3 + vuln_bin
            if crime_bin is not None and vuln_bin is not None
            else None
        )

    archetype_groups = {
        "economic": ("unemployment", "deprivation", "noQualifications"),
        "housing_mobility": ("privateRenting", "recentMigration"),
        "youth": ("youthShare",),
    }
    archetype_indicator_to_group = {
        indicator: group
        for group, indicators in archetype_groups.items()
        for indicator in indicators
    }

    for feature in runtime_features:
        props = feature["properties"]
        archetype: str | None = None
        if props.get("bivariateBin") == 8:
            indicator_scores: Dict[str, float] = {}
            missing = False
            for indicator in archetype_indicator_to_group:
                value = props.get(f"{indicator}Score")
                if value is None:
                    missing = True
                    break
                indicator_scores[indicator] = value
            if not missing and indicator_scores:
                sorted_inds = sorted(
                    indicator_scores.items(), key=lambda kv: kv[1], reverse=True
                )
                top_indicator, top_value = sorted_inds[0]
                second_value = sorted_inds[1][1] if len(sorted_inds) > 1 else top_value
                top_group = archetype_indicator_to_group[top_indicator]
                second_group = (
                    archetype_indicator_to_group[sorted_inds[1][0]]
                    if len(sorted_inds) > 1
                    else top_group
                )
                if top_value - second_value < 3 and top_group != second_group:
                    archetype = "mixed"
                else:
                    archetype = top_group
        props["archetype"] = archetype
        props["archetypeDominantScore"] = (
            None
            if archetype is None or archetype == "mixed"
            else round_safe(
                max(
                    props.get(f"{indicator}Score") or 0
                    for indicator in archetype_groups[archetype]
                ),
                2,
            )
        )

    # --- P6 counterfactual OLS ---
    # Fit crimeRate ~ 6 structural indicators + populationDensity (+ intercept).
    # Front-end uses beta to simulate "what if indicator X were proportionally
    # reduced by k%"; framing is strictly correlational, not causal.
    ols_features = [
        "unemployment",
        "privateRenting",
        "deprivation",
        "noQualifications",
        "recentMigration",
        "youthShare",
        "populationDensity",
    ]
    ols_rows: List[Tuple[str, float, List[float]]] = []
    for feature in runtime_features:
        props = feature["properties"]
        if props.get("crimeRate") is None:
            continue
        values = [props.get(key) for key in ols_features]
        if any(value is None for value in values):
            continue
        ols_rows.append((props["code"], float(props["crimeRate"]), [float(v) for v in values]))

    model_payload: Dict[str, Any] = {}
    if ols_rows:
        design = np.array([[1.0] + row[2] for row in ols_rows])
        target = np.array([row[1] for row in ols_rows])
        xtx = design.T @ design
        beta = np.linalg.solve(xtx, design.T @ target)
        fitted = design @ beta
        residuals = target - fitted
        n_obs, n_params = design.shape
        dof = max(n_obs - n_params, 1)
        rss = float(residuals @ residuals)
        tss = float(((target - target.mean()) ** 2).sum())
        r_squared = 1.0 - rss / tss if tss > 0 else 0.0
        sigma2 = rss / dof
        cov = sigma2 * np.linalg.inv(xtx)
        se = np.sqrt(np.diag(cov))
        t_stats = beta / se

        predicted_by_code = {row[0]: float(fitted[i]) for i, row in enumerate(ols_rows)}
        feature_means = {
            key: round_safe(float(design[:, i + 1].mean()), 3)
            for i, key in enumerate(ols_features)
        }

        model_payload = {
            "target": "crimeRate",
            "targetUnit": "crimes per 1000 residents (2025 Q4)",
            "intercept": {
                "coefficient": round_safe(float(beta[0]), 4),
                "standardError": round_safe(float(se[0]), 4),
                "tStatistic": round_safe(float(t_stats[0]), 2),
            },
            "predictors": [
                {
                    "key": key,
                    "coefficient": round_safe(float(beta[i + 1]), 4),
                    "standardError": round_safe(float(se[i + 1]), 4),
                    "tStatistic": round_safe(float(t_stats[i + 1]), 2),
                    "mean": feature_means[key],
                }
                for i, key in enumerate(ols_features)
            ],
            "rSquared": round_safe(float(r_squared), 4),
            "observations": int(n_obs),
            "residualDegreesOfFreedom": int(dof),
            "targetMean": round_safe(float(target.mean()), 3),
            "predictedMean": round_safe(float(fitted.mean()), 3),
        }

        for feature in runtime_features:
            props = feature["properties"]
            code = props.get("code")
            props["predictedCrimeRate"] = round_safe(predicted_by_code.get(code), 2)
    else:
        for feature in runtime_features:
            feature["properties"]["predictedCrimeRate"] = None

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
        "counterfactualModel": model_payload,
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


def spearman_r(x: List[float], y: List[float]) -> float:
    """Compute Spearman correlation between two lists."""

    def rank(values: List[float]) -> List[float]:
        sorted_idx = sorted(range(len(values)), key=lambda i: values[i])
        ranks = [0.0] * len(values)
        i = 0
        while i < len(sorted_idx):
            j = i
            while j < len(sorted_idx) - 1 and values[sorted_idx[j + 1]] == values[sorted_idx[j]]:
                j += 1
            avg_rank = (i + j) / 2 + 1
            for k in range(i, j + 1):
                ranks[sorted_idx[k]] = avg_rank
            i = j + 1
        return ranks

    n = len(x)
    if n == 0:
        return 0
    rx, ry = rank(x), rank(y)
    mean_rx = sum(rx) / n
    mean_ry = sum(ry) / n
    num = sum((rx[i] - mean_rx) * (ry[i] - mean_ry) for i in range(n))
    den = (
        sum((r - mean_rx) ** 2 for r in rx)
        * sum((r - mean_ry) ** 2 for r in ry)
    ) ** 0.5
    return num / den if den != 0 else 0


def simple_ols(x: List[float], y: List[float]) -> Tuple[float, float, float]:
    """Returns (slope, intercept, r_squared)."""
    n = len(x)
    if n == 0:
        return 0, 0, 0
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    ss_xy = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    ss_xx = sum((xi - mean_x) ** 2 for xi in x)
    slope = ss_xy / ss_xx if ss_xx != 0 else 0
    intercept = mean_y - slope * mean_x
    y_pred = [slope * xi + intercept for xi in x]
    ss_res = sum((y[i] - y_pred[i]) ** 2 for i in range(n))
    ss_tot = sum((yi - mean_y) ** 2 for yi in y)
    r2 = 1 - ss_res / ss_tot if ss_tot != 0 else 0
    return round(slope, 4), round(intercept, 4), round(r2, 4)


def compute_research_stats() -> None:
    lsoa_path = OUTPUT_ROOT / "lsoa.geojson"
    if not lsoa_path.exists():
        print(f"Warning: {lsoa_path} does not exist; skipping research stats.")
        return

    lsoa_geojson = read_json(lsoa_path)
    features = lsoa_geojson.get("features", [])
    if not features:
        print(f"Warning: {lsoa_path} has no features; skipping research stats.")
        return

    field_map = {
        "crime_rate": "crimeRate",
        "unemployment_rate": "unemployment",
        "private_renting_rate": "privateRenting",
        "deprivation_score": "deprivation",
        "no_qualifications_rate": "noQualifications",
        "recent_migration_rate": "recentMigration",
        "youth_share": "youthShare",
        "population_density": "populationDensity",
    }
    variable_labels = {
        "unemployment_rate": "Unemployment Rate",
        "private_renting_rate": "Private Renting Rate",
        "deprivation_score": "Deprivation Score",
        "no_qualifications_rate": "No Qualifications Rate",
        "recent_migration_rate": "Recent Migration Rate",
        "youth_share": "Age 20-24 Share",
        "population_density": "Population Density",
    }

    rows: List[Dict[str, float]] = []
    for feature in features:
        properties = feature.get("properties", {})
        values = {
            semantic_name: to_float(properties.get(runtime_name))
            for semantic_name, runtime_name in field_map.items()
        }
        if any(value is None for value in values.values()):
            continue
        rows.append({key: value for key, value in values.items() if value is not None})

    if not rows:
        print("Warning: no complete LSOA rows available for research stats.")
        return

    crime_values = [row["crime_rate"] for row in rows]
    correlations = []
    for variable, label in variable_labels.items():
        x_values = [row[variable] for row in rows]
        n_pairs = len(x_values)
        spearman = spearman_r(x_values, crime_values)
        slope, intercept, r_squared = simple_ols(x_values, crime_values)
        # Significance based on Spearman magnitude only — R² is suppressed by
        # extreme outliers (Westminster, City of London) and is not a reliable
        # significance indicator here. ρ > 0.25 with n ≈ 4600 is p << 0.001.
        significant = abs(spearman) > 0.25
        direction = "higher" if spearman >= 0 else "lower"
        strength = "consistently" if significant else "weakly"
        # Build scatter sample (≤500 evenly-spaced points) for front-end plots
        step = max(1, n_pairs // 500)
        scatter_sample = [
            {"x": round(x_values[i], 4), "y": round(crime_values[i], 2)}
            for i in range(0, n_pairs, step)
        ]
        correlations.append(
            {
                "variable": variable,
                "label": label,
                "spearman": round(spearman, 4),
                "r_squared": r_squared,
                "slope": slope,
                "intercept": round(intercept, 4),
                "n": n_pairs,
                "significant": significant,
                "description": (
                    f"Areas with higher {label.lower()} {strength} show {direction} crime rates"
                ),
                "scatterSample": scatter_sample,
            }
        )

    correlations.sort(key=lambda item: abs(item["spearman"]), reverse=True)
    write_json(
        OUTPUT_ROOT / "research_stats.json",
        {
            "correlations": correlations,
            "meta": {
                "n_lsoa": len(rows),
                "method": "Spearman rank correlation + simple OLS regression",
                "crime_variable": "crime_rate_per_1000",
                "data_year": "2021 Census + 2025 Q4 Crime",
            },
        },
    )


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
    if structural_summary.get("counterfactualModel"):
        write_json(
            OUTPUT_ROOT / "model_coefficients.json",
            structural_summary["counterfactualModel"],
        )
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

    compute_research_stats()
    print(f"Prepared runtime data in {OUTPUT_ROOT}")
    print(f"Prepared research stats in {OUTPUT_ROOT / 'research_stats.json'}")


if __name__ == "__main__":
    main()
