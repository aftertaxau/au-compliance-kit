"""Extract the 'Sample data' tables from ATO Schedule 1 (LI 2026/18 text) into JSON fixtures.

Usage: python3 -I scripts/extract-ato-samples.py <li-text-file> <out.json>
Source: Taxation Administration (Withholding Schedules) instrument LI 2026/18, Schedule 1,
'Sample data' section, payments made from 1 July 2026.
"""
import json, re, sys

lines = open(sys.argv[1], encoding="utf-8").read().split("\n")
start = next(i for i, l in enumerate(lines) if l.strip() == "Sample data")
end = next(i for i, l in enumerate(lines) if i > start and l.startswith("Schedule 2 "))
block = lines[start:end]

sections = [
    ("withholding", "weekly", "Weekly withholding amounts"),
    ("withholding", "fortnightly", "Fortnightly withholding amounts"),
    ("withholding", "monthly", "Monthly withholding amounts"),
    ("medicare_scale2", "weekly", "Weekly Medicare levy adjustment"),
    ("medicare_scale2", "fortnightly", "Fortnightly Medicare levy adjustment"),
    ("medicare_scale2", "monthly", "Monthly Medicare levy adjustment"),
    ("medicare_scale6", "weekly", "Weekly Medicare half-levy adjustment"),
    ("medicare_scale6", "fortnightly", "Fortnightly Medicare half-levy adjustment"),
    ("medicare_scale6", "monthly", "Monthly Medicare half-levy adjustment"),
]
idx = []
for kind, period, title in sections:
    i = next(j for j, l in enumerate(block) if l.strip() == title)
    idx.append((i, kind, period))
idx.sort()
stop = next(j for j, l in enumerate(block) if l.startswith("Do not allow for any tax offsets"))

num = re.compile(r"^-?[\d,]+(\.\d+)?$")
out = {"source": "ATO LI 2026/18 Schedule 1 'Sample data' (payments from 1 July 2026)", "cases": []}
for n, (i, kind, period) in enumerate(idx):
    j = idx[n + 1][0] if n + 1 < len(idx) else stop
    cells, raw = [], []
    for l in block[i:j]:
        for c in l.split("|"):
            c = c.strip()
            if num.match(c):
                cells.append(float(c.replace(",", "")))
                raw.append(c)
    # Skip header cells (e.g. the "1", "2" in "1 child", "2 children"): data starts at the first
    # whole-number earnings cell followed by an amount with decimals.
    start_at = 0
    while start_at < len(raw) and re.fullmatch(r"[1-9]", raw[start_at]):
        start_at += 1
    cells = cells[start_at:]
    width = 7 if kind == "medicare_scale2" else 6
    if len(cells) % width:
        raise SystemExit(f"{kind}/{period}: {len(cells)} numeric cells not divisible by {width}")
    for k in range(0, len(cells), width):
        row = cells[k:k + width]
        if kind == "withholding":
            out["cases"].append({"kind": kind, "period": period, "earnings": row[0],
                                 "scale1": row[1], "scale2": row[2], "scale3": row[3],
                                 "scale5": row[4], "scale6": row[5]})
        elif kind == "medicare_scale2":
            out["cases"].append({"kind": kind, "period": period, "earnings": row[0],
                                 "spouseOnly": row[1], "children": row[2:7]})
        else:  # scale 6 half-levy tables have no spouse-only column
            out["cases"].append({"kind": kind, "period": period, "earnings": row[0],
                                 "children": row[1:6]})
json.dump(out, open(sys.argv[2], "w"), indent=1)
from collections import Counter
print(Counter((c["kind"], c["period"]) for c in out["cases"]))
