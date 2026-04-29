"""
patch_geojson_crime_types.py
----------------------------
Reads crime_types.json (already built by build_crime_types.py),
patches lsoa.geojson to add violentRate / violentRateScore /
propertyRate / propertyRateScore to each feature's properties,
and rewrites a lean crime_types.json with just summary + correlations.

Run:  py -3 data/patch_geojson_crime_types.py
"""

import json, os

BASE   = os.path.dirname(os.path.abspath(__file__))
ROOT   = os.path.dirname(BASE)
PUB    = os.path.join(ROOT, "public", "data")

CT_JSON  = os.path.join(BASE, "generated", "crime_types.json")
GEO_JSON = os.path.join(PUB, "lsoa.geojson")
CORR_OUT = os.path.join(PUB, "crime_correlations.json")

# 1. load crime_types records
print("Loading crime_types.json ...")
with open(CT_JSON, encoding="utf-8") as f:
    ct = json.load(f)

lookup = {r["code"]: r for r in ct["records"]}
print(f"  Records: {len(lookup)}")

# 2. patch geojson
print("Patching lsoa.geojson ...")
with open(GEO_JSON, encoding="utf-8") as f:
    geo = json.load(f)

patched = 0
for feat in geo["features"]:
    code = feat["properties"]["code"]
    rec  = lookup.get(code)
    if rec:
        feat["properties"]["violentRate"]       = rec["violentRate"]
        feat["properties"]["violentRateScore"]  = rec["violentRateScore"]
        feat["properties"]["propertyRate"]      = rec["propertyRate"]
        feat["properties"]["propertyRateScore"] = rec["propertyRateScore"]
        patched += 1

print(f"  Patched: {patched} features")

with open(GEO_JSON, "w", encoding="utf-8") as f:
    json.dump(geo, f, separators=(",", ":"))
size = os.path.getsize(GEO_JSON)/1024
print(f"  lsoa.geojson rewritten ({size:.0f} KB)")

# 3. write lean correlations file (no bulky records / scatter)
print("Writing crime_correlations.json ...")
lean = {
    "summary"     : ct["summary"],
    "correlations": ct["correlations"],
}
with open(CORR_OUT, "w", encoding="utf-8") as f:
    json.dump(lean, f, separators=(",", ":"))
size2 = os.path.getsize(CORR_OUT)/1024
print(f"  crime_correlations.json written ({size2:.0f} KB)")

# 4. keep the bulky intermediate file for reproducibility.
# It is generated under data/generated and is not fetched by the frontend.
print("  crime_types.json kept under data/generated as an intermediate reproducibility file")
print("Done.")
