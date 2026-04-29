"""
patch_subindices.py
-------------------
Adds two sub-index fields to lsoa.geojson:
  deprivationSubIndex  = mean(unemploymentScore, deprivationScore, noQualificationsScore)
  mobilitySubIndex     = mean(privateRentingScore, recentMigrationScore)

Run:  py -3 data/patch_subindices.py
"""
import json, os

ROOT    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEOJSON = os.path.join(ROOT, "public", "data", "lsoa.geojson")

print("Loading lsoa.geojson ...")
with open(GEOJSON, encoding="utf-8") as f:
    geo = json.load(f)

patched = 0
missing = 0

for feat in geo["features"]:
    p = feat["properties"]

    # ── deprivation sub-index ──────────────────────────────────────────────
    deprivation_scores = [
        p.get("unemploymentScore"),
        p.get("deprivationScore"),
        p.get("noQualificationsScore"),
    ]
    valid_d = [v for v in deprivation_scores if v is not None]

    # ── mobility sub-index ─────────────────────────────────────────────────
    mobility_scores = [
        p.get("privateRentingScore"),
        p.get("recentMigrationScore"),
    ]
    valid_m = [v for v in mobility_scores if v is not None]

    if valid_d and valid_m:
        p["deprivationSubIndex"] = round(sum(valid_d) / len(valid_d), 2)
        p["mobilitySubIndex"]    = round(sum(valid_m) / len(valid_m), 2)
        patched += 1
    else:
        p["deprivationSubIndex"] = None
        p["mobilitySubIndex"]    = None
        missing += 1

print(f"  Patched : {patched}")
print(f"  Missing : {missing}")

with open(GEOJSON, "w", encoding="utf-8") as f:
    json.dump(geo, f, separators=(",", ":"))

size_kb = os.path.getsize(GEOJSON) / 1024
print(f"  lsoa.geojson rewritten ({size_kb:.0f} KB)")
print("Done.")
