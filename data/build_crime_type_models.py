"""
build_crime_type_models.py
--------------------------
Fits two OLS models using the same structural predictors as the main
model_coefficients.json, but targeting violentRate and propertyRate
separately (both already patched into lsoa.geojson).

Outputs: public/data/crime_type_models.json
  {
    violent:  { target, predictors:[{key,coefficient,mean},...], rSquared, observations },
    property: { ... }
  }

Run:  py -3 data/build_crime_type_models.py
"""
import json, os, math

ROOT    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEOJSON = os.path.join(ROOT, "public", "data", "lsoa.geojson")
OUT     = os.path.join(ROOT, "public", "data", "crime_type_models.json")

PREDICTORS = [
    "unemployment",
    "privateRenting",
    "deprivation",
    "noQualifications",
    "recentMigration",
    "youthShare",
    "populationDensity",
]

print("Loading lsoa.geojson ...")
with open(GEOJSON, encoding="utf-8") as f:
    geo = json.load(f)

# ── collect rows with all fields present ──────────────────────────────────────
rows_violent  = []
rows_property = []

for feat in geo["features"]:
    p = feat["properties"]
    xs = [p.get(k) for k in PREDICTORS]
    if any(v is None for v in xs):
        continue
    if p.get("violentRate")  is not None:
        rows_violent.append(([1.0] + [float(v) for v in xs], float(p["violentRate"])))
    if p.get("propertyRate") is not None:
        rows_property.append(([1.0] + [float(v) for v in xs], float(p["propertyRate"])))

print(f"  Violent  rows: {len(rows_violent)}")
print(f"  Property rows: {len(rows_property)}")

# ── minimal OLS via normal equations (no numpy dependency) ────────────────────
def transpose(M):
    return [[M[r][c] for r in range(len(M))] for c in range(len(M[0]))]

def mat_mul(A, B):
    rows_a, cols_a = len(A), len(A[0])
    cols_b = len(B[0])
    C = [[0.0]*cols_b for _ in range(rows_a)]
    for i in range(rows_a):
        for k in range(cols_a):
            if A[i][k] == 0:
                continue
            for j in range(cols_b):
                C[i][j] += A[i][k] * B[k][j]
    return C

def mat_vec(A, v):
    return [sum(A[i][j]*v[j] for j in range(len(v))) for i in range(len(A))]

def cholesky_solve(A, b):
    """Solve Ax=b where A is symmetric positive definite via Cholesky."""
    n = len(A)
    L = [[0.0]*n for _ in range(n)]
    for i in range(n):
        s = A[i][i] - sum(L[i][k]**2 for k in range(i))
        if s <= 0:
            raise ValueError(f"Matrix not positive definite at step {i}, s={s}")
        L[i][i] = math.sqrt(s)
        for j in range(i+1, n):
            L[j][i] = (A[j][i] - sum(L[j][k]*L[i][k] for k in range(i))) / L[i][i]
    # forward substitution: Ly = b
    y = [0.0]*n
    for i in range(n):
        y[i] = (b[i] - sum(L[i][k]*y[k] for k in range(i))) / L[i][i]
    # backward substitution: L^T x = y
    x = [0.0]*n
    for i in range(n-1, -1, -1):
        x[i] = (y[i] - sum(L[j][i]*x[j] for j in range(i+1, n))) / L[i][i]
    return x

def fit_ols(rows, pred_keys):
    """rows: list of ([1,x1,...,xk], y). Returns dict with coefficients & R²."""
    X = [r[0] for r in rows]
    y = [r[1] for r in rows]
    n = len(X)
    k = len(X[0])  # includes intercept

    Xt  = transpose(X)
    XtX = mat_mul(Xt, X)
    Xty = mat_vec(Xt, y)
    beta = cholesky_solve(XtX, Xty)

    # fitted values & R²
    y_hat = [sum(X[i][j]*beta[j] for j in range(k)) for i in range(n)]
    y_bar = sum(y)/n
    ss_res = sum((y[i]-y_hat[i])**2 for i in range(n))
    ss_tot = sum((y[i]-y_bar)**2    for i in range(n))
    r2 = 1 - ss_res/ss_tot if ss_tot > 0 else 0.0

    # means of predictors (excluding intercept column)
    means = [sum(Xt[j])/n for j in range(1, k)]

    predictors_out = []
    for idx, key in enumerate(pred_keys):
        predictors_out.append({
            "key":         key,
            "coefficient": round(beta[idx+1], 4),
            "mean":        round(means[idx], 3),
        })

    return {
        "intercept":    round(beta[0], 4),
        "predictors":   predictors_out,
        "rSquared":     round(r2, 4),
        "observations": n,
    }

print("Fitting violent model ...")
violent_model  = fit_ols(rows_violent,  PREDICTORS)
violent_model["target"] = "violentRate"
violent_model["targetUnit"] = "violent crimes per 1,000 residents"

print("Fitting property model ...")
property_model = fit_ols(rows_property, PREDICTORS)
property_model["target"] = "propertyRate"
property_model["targetUnit"] = "property crimes per 1,000 residents"

out = { "violent": violent_model, "property": property_model }

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(out, f, separators=(",", ":"), indent=2)

print(f"\nViolent  R2 = {violent_model['rSquared']:.3f}  n={violent_model['observations']}")
print(f"Property R2 = {property_model['rSquared']:.3f}  n={property_model['observations']}")
print(f"\nCoefficients:")
print(f"  {'Key':<20} {'beta_violent':>14} {'beta_property':>14}")
vm = {p['key']: p['coefficient'] for p in violent_model['predictors']}
pm = {p['key']: p['coefficient'] for p in property_model['predictors']}
for k in PREDICTORS:
    print(f"  {k:<20} {vm.get(k, 0):>14.4f} {pm.get(k, 0):>14.4f}")
print(f"\nWritten: {OUT}")
