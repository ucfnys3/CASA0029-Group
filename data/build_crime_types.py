"""
build_crime_types.py
--------------------
Reads MPS LSOA Level Crime (Historical).csv for 2021 (full year),
splits into violent / property crime, computes per-1000 rates,
runs Spearman correlations with structural indicators from lsoa.geojson,
and writes public/data/crime_types.json for the new Crime Type page.

Run from the project root:
    py -3 data/build_crime_types.py
"""

import csv, json, math, os
from collections import defaultdict

# ── paths ──────────────────────────────────────────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)

MPS_CSV   = os.path.join(BASE, "MPS LSOA Level Crime (Historical).csv")
GEOJSON   = os.path.join(ROOT, "public", "data", "lsoa.geojson")
OUT       = os.path.join(ROOT, "public", "data", "crime_types.json")

# ── crime category mapping ─────────────────────────────────────────────────
VIOLENT_CATS  = {"VIOLENCE AGAINST THE PERSON", "ROBBERY"}
PROPERTY_CATS = {"THEFT", "BURGLARY", "VEHICLE OFFENCES"}

YEAR_COLS = [f"2021{m:02d}" for m in range(1, 13)]   # 202101 … 202112

# ── structural indicators to correlate ─────────────────────────────────────
INDICATORS = [
    ("deprivation",          "Deprivation"),
    ("unemployment",         "Unemployment"),
    ("noQualifications",     "No qualifications"),
    ("youthShare",           "Youth share (16–24)"),
    ("privateRenting",       "Private renting"),
    ("recentMigration",      "Recent migration"),
    ("populationDensity",    "Population density"),
]

# ── 1. aggregate 2021 crime counts per LSOA by group ─────────────────────
print("Reading MPS CSV …")
violent_count  = defaultdict(int)
property_count = defaultdict(int)

with open(MPS_CSV, encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        code = row["LSOA Code"].strip()
        cat  = row["Major Category"].strip()
        total = sum(int(row.get(c, 0) or 0) for c in YEAR_COLS)
        if cat in VIOLENT_CATS:
            violent_count[code]  += total
        elif cat in PROPERTY_CATS:
            property_count[code] += total

print(f"  LSOAs with violent data  : {len(violent_count)}")
print(f"  LSOAs with property data : {len(property_count)}")

# ── 2. load lsoa.geojson for population + structural indicators ────────────
print("Loading lsoa.geojson …")
with open(GEOJSON, encoding="utf-8") as f:
    geojson = json.load(f)

features = geojson["features"]
print(f"  Features loaded: {len(features)}")

# ── 3. compute rates + build per-LSOA records ─────────────────────────────
records = []
for feat in features:
    p = feat["properties"]
    code = p["code"]
    pop  = p.get("population") or 0
    if pop <= 0:
        continue

    v_count  = violent_count.get(code, 0)
    pr_count = property_count.get(code, 0)

    v_rate  = (v_count  / pop) * 1000
    pr_rate = (pr_count / pop) * 1000

    record = {
        "code"              : code,
        "name"              : p["name"],
        "borough"           : p["borough"],
        "population"        : pop,
        "violentCount"      : v_count,
        "propertyCount"     : pr_count,
        "violentRate"       : round(v_rate,  3),
        "propertyRate"      : round(pr_rate, 3),
    }
    # attach structural indicators
    for key, _ in INDICATORS:
        record[key] = p.get(key)

    records.append(record)

print(f"  Records built: {len(records)}")

# ── 4. percentile scoring (0–100) for map choropleth ─────────────────────
def pct_score(values):
    """Convert raw list to 0–100 percentile rank scores, None-safe."""
    indexed = [(v, i) for i, v in enumerate(values) if v is not None]
    indexed.sort(key=lambda x: x[0])
    n = len(indexed)
    scores = [None] * len(values)
    for rank, (_, orig_i) in enumerate(indexed):
        scores[orig_i] = round((rank / (n - 1)) * 100, 2) if n > 1 else 50.0
    return scores

v_rates  = [r["violentRate"]  for r in records]
pr_rates = [r["propertyRate"] for r in records]

v_scores  = pct_score(v_rates)
pr_scores = pct_score(pr_rates)

for i, r in enumerate(records):
    r["violentRateScore"]  = v_scores[i]
    r["propertyRateScore"] = pr_scores[i]

# ── 5. Spearman correlation (rank-based) ──────────────────────────────────
def spearman(xs, ys):
    """Spearman correlation between two lists, skipping None pairs."""
    pairs = [(x, y) for x, y in zip(xs, ys)
             if x is not None and y is not None]
    if len(pairs) < 10:
        return None, len(pairs)
    n = len(pairs)

    def rank(vals):
        sorted_v = sorted(enumerate(vals), key=lambda t: t[1])
        r = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j < n - 1 and sorted_v[j+1][1] == sorted_v[j][1]:
                j += 1
            avg_rank = (i + j) / 2.0 + 1
            for k in range(i, j + 1):
                r[sorted_v[k][0]] = avg_rank
            i = j + 1
        return r

    rx = rank([p[0] for p in pairs])
    ry = rank([p[1] for p in pairs])
    d2 = sum((a - b) ** 2 for a, b in zip(rx, ry))
    rho = 1 - (6 * d2) / (n * (n * n - 1))
    return round(rho, 4), n

print("\nSpearman correlations (2021 data):")
correlations = []
for key, label in INDICATORS:
    ind_vals = [r.get(key) for r in records]

    rho_v,  n_v  = spearman(v_rates,  ind_vals)
    rho_pr, n_pr = spearman(pr_rates, ind_vals)

    print(f"  {label:30s}  violent={rho_v:+.3f} (n={n_v})  property={rho_pr:+.3f} (n={n_pr})")
    correlations.append({
        "key"          : key,
        "label"        : label,
        "violentRho"   : rho_v,
        "propertyRho"  : rho_pr,
        "n"            : n_v,
    })

# ── 6. summary stats ──────────────────────────────────────────────────────
def safe_mean(lst):
    vals = [v for v in lst if v is not None]
    return round(sum(vals) / len(vals), 3) if vals else None

def safe_median(lst):
    vals = sorted(v for v in lst if v is not None)
    if not vals:
        return None
    m = len(vals) // 2
    return round((vals[m] if len(vals) % 2 else (vals[m-1]+vals[m])/2), 3)

summary = {
    "violent" : {
        "mean"       : safe_mean(v_rates),
        "median"     : safe_median(v_rates),
        "totalCount" : sum(r["violentCount"]  for r in records),
    },
    "property": {
        "mean"       : safe_mean(pr_rates),
        "median"     : safe_median(pr_rates),
        "totalCount" : sum(r["propertyCount"] for r in records),
    },
    "lsoaCount": len(records),
    "year"     : 2021,
}

# ── 7. scatter sample for the correlation chart (max 300 pts per indicator)
import random
random.seed(42)

def build_scatter(indicator_key, crime_rates, crime_label):
    pairs = [
        {"x": r[indicator_key], "y": cr, "code": r["code"]}
        for r, cr in zip(records, crime_rates)
        if r[indicator_key] is not None and cr is not None
    ]
    if len(pairs) > 300:
        pairs = random.sample(pairs, 300)
    return pairs

scatter_samples = {}
for key, _label in INDICATORS:
    scatter_samples[key] = {
        "violent" : build_scatter(key, v_rates,  "violent"),
        "property": build_scatter(key, pr_rates, "property"),
    }

# ── 8. write output ──────────────────────────────────────────────────────
output = {
    "summary"       : summary,
    "correlations"  : correlations,
    "records"       : records,
    "scatterSamples": scatter_samples,
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(output, f, separators=(",", ":"))

size_kb = os.path.getsize(OUT) / 1024
print(f"\n✓ Written: {OUT}  ({size_kb:.0f} KB)")
