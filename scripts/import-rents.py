# Builds site/data/rents.json: median weekly rents for new leases by local government area (LGA)
# in New South Wales and Victoria, June quarter 2026.
#
# NSW: Department of Communities and Justice, Rent and Sales Report, rent tables, June quarter 2026
#   https://dcj.nsw.gov.au/about-us/families-and-communities-statistics/housing-rent-and-sales/rent-and-sales-report.html
#   Licence CC BY 4.0, (c) State of New South Wales (Department of Communities and Justice).
# VIC: Homes Victoria, Rental Report, quarterly median rents by local government area, June quarter 2026
#   https://www.dffh.vic.gov.au/publications/rental-report  (DataVic, CC BY 4.0)
#
# Usage: python3 -I scripts/import-rents.py <nsw rent tables xlsx> <vic quarterly LGA xlsx> site/data/rents.json
import json
import re
import sys

import openpyxl
import pandas as pd

nsw_path, vic_path, dest = sys.argv[1], sys.argv[2], sys.argv[3]
QUARTER = "Jun 2026"


def slugify(name):
    s = name.lower().replace("&", " and ")
    s = re.sub(r"\(.*?\)", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return re.sub(r"-+", "-", s)


def to_int(v):
    if v is None:
        return None
    s = str(v).replace(",", "").replace("$", "").strip()
    return int(float(s)) if re.fullmatch(r"\d+(\.\d+)?", s) else None


areas = []

# ---------- NSW ----------
df = pd.read_excel(nsw_path, sheet_name="LGA", header=8, dtype=str)
cols = list(df.columns)
gmr, syd, ring, lga, dtype_, beds = cols[:6]
median_col = next(c for c in cols if c.startswith("Median Weekly Rent"))
bonds_col = next(c for c in cols if c.startswith("New Bonds Lodged"))
d = df[(df[gmr] != "Total") & (df[syd] != "Total") & (df[ring] != "Total") & (df[lga] != "Total")]
for name, g in d.groupby(lga):
    def med(dt, bd):
        row = g[(g[dtype_] == dt) & (g[beds] == bd)]
        return to_int(row[median_col].iloc[0]) if len(row) else None
    total = med("Total", "Total")
    if total is None:
        continue
    first = g.iloc[0]
    region = "Greater Sydney" if first[syd] == "Greater Sydney" else ("Newcastle and Lake Macquarie" if "Newcastle" in str(first[ring]) else ("Illawarra" if "Wollongong" in str(first[ring]) else "Regional NSW"))
    bonds_row = g[(g[dtype_] == "Total") & (g[beds] == "Total")]
    clean = re.sub(r"\s*\(.*?\)\s*$", "", name).strip()
    areas.append({
        "state": "NSW", "name": clean, "slug": slugify(clean), "region": region,
        "all": total,
        "unit1": med("Flat/Unit", "1 Bedroom"),
        "unit2": med("Flat/Unit", "2 Bedrooms"),
        "house3": med("House", "3 Bedrooms"),
        "newLeases": to_int(bonds_row[bonds_col].iloc[0]) if len(bonds_row) else None,
    })

# ---------- VIC ----------
wb = openpyxl.load_workbook(vic_path, read_only=True, data_only=True)
SHEETS = {"all": "All properties", "unit1": "1 bedroom flat", "unit2": "2 bedroom flat", "house3": "3 bedroom house"}
SKIP = {"Group Total", "Table Total", "Metro", "Non-Metro", "Victoria", None, ""}
vic = {}
for key, sheet in SHEETS.items():
    rows = list(wb[sheet].iter_rows(values_only=True))
    labels, kinds = rows[1], rows[2]
    med_i = next(i for i, (l, k) in enumerate(zip(labels, kinds)) if l == QUARTER and k == "Median")
    cnt_i = next(i for i, (l, k) in enumerate(zip(labels, kinds)) if l == QUARTER and k == "Count")
    region = None
    for r in rows[3:]:
        if r[0]:
            region = str(r[0]).strip()
        name = (str(r[1]).strip() if r[1] else "")
        if name in SKIP or region in ("Table Total",):
            continue
        entry = vic.setdefault(name, {"state": "VIC", "name": name, "slug": slugify(name), "region": "Greater Melbourne" if region and "Metro" in region and "Non" not in region else region})
        entry[key] = to_int(r[med_i])
        if key == "all":
            entry["newLeases"] = to_int(r[cnt_i])
            entry["vicRegion"] = region
for e in vic.values():
    if e.get("all"):
        areas.append({k: e.get(k) for k in ("state", "name", "slug", "region", "all", "unit1", "unit2", "house3", "newLeases")})

# Unique slugs within each state
seen = set()
for a in areas:
    key = (a["state"], a["slug"])
    if key in seen:
        a["slug"] = a["slug"] + "-" + a["state"].lower()
    seen.add((a["state"], a["slug"]))

meta = {
    "quarter": "June quarter 2026",
    "measure": "Median weekly rent for new leases (new bonds lodged / new lettings) in the quarter",
    "sources": {
        "NSW": {"name": "NSW Department of Communities and Justice, Rent and Sales Report (June quarter 2026)", "url": "https://dcj.nsw.gov.au/about-us/families-and-communities-statistics/housing-rent-and-sales/rent-and-sales-report.html", "licence": "CC BY 4.0, (c) State of New South Wales (Department of Communities and Justice)"},
        "VIC": {"name": "Homes Victoria, Rental Report: quarterly median rents by local government area (June quarter 2026)", "url": "https://www.dffh.vic.gov.au/publications/rental-report", "licence": "CC BY 4.0 (DataVic), Homes Victoria"},
    },
}
with open(dest, "w") as f:
    json.dump({"meta": meta, "areas": areas}, f, indent=1, ensure_ascii=False)
print(f"{len(areas)} areas written ({sum(a['state'] == 'NSW' for a in areas)} NSW, {sum(a['state'] == 'VIC' for a in areas)} VIC)")
