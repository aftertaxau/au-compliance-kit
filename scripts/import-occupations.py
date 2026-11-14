# Builds site/data/occupations.json from Jobs and Skills Australia's occupation data spreadsheet.
#
# Source: Jobs and Skills Australia, "ANZSCO Occupation data - February 2026.xlsx"
#   https://www.jobsandskills.gov.au/data/occupation-and-industry-profiles
# Earnings: ABS Survey of Employee Earnings and Hours, May 2025 (customised report): median pay for
# full-time non-managerial employees paid at the adult rate, before tax and salary sacrifice.
# Licence: CC BY 4.0, (c) Commonwealth of Australia.
#
# Usage: python3 -I scripts/import-occupations.py <path to the xlsx> site/data/occupations.json
import json
import re
import sys

import openpyxl

src, dest = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(src, read_only=True, data_only=True)


def table(name):
    out = []
    for r in wb[name].iter_rows(min_row=8, values_only=True):
        if r and isinstance(r[0], int):
            out.append(r)
    return out


def num(v):
    return v if isinstance(v, (int, float)) else None


def slugify(name):
    s = name.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return re.sub(r"-+", "-", s)


MAJOR = {
    1: "Managers", 2: "Professionals", 3: "Technicians and Trades Workers",
    4: "Community and Personal Service Workers", 5: "Clerical and Administrative Workers",
    6: "Sales Workers", 7: "Machinery Operators and Drivers", 8: "Labourers",
}

overview = {r[0]: r for r in table("Table_1")}
earnings = {r[0]: r for r in table("Table_4")}
descriptions = {r[0]: r[2] for r in table("Table_2")}

# 6-digit job titles grouped under their 4-digit occupation
titles = {}
for code, r in overview.items():
    if code > 99999:
        titles.setdefault(code // 100, []).append(r[1])

occupations = []
seen = set()
for code, r in sorted(earnings.items()):
    if not (1000 <= code <= 9999):
        continue
    weekly, hourly = num(r[4]), num(r[5])
    if weekly is None:
        continue
    name = r[1].strip()
    slug = slugify(name)
    if slug in seen:
        slug = f"{slug}-{code}"
    seen.add(slug)
    ov = overview.get(code, ())
    occupations.append({
        "code": code,
        "name": name,
        "slug": slug,
        "major": code // 1000,
        "majorName": MAJOR[code // 1000],
        "minor": code // 10,
        "medianWeekly": weekly,
        "medianHourly": hourly,
        "avgFullTimeHours": num(r[3]),
        "fullTimeShare": num(r[2]),
        "employed": num(ov[2]) if len(ov) > 2 else None,
        "femaleShare": num(ov[4]) if len(ov) > 4 else None,
        "medianAge": num(ov[6]) if len(ov) > 6 else None,
        "description": (descriptions.get(code) or "").strip(),
        "titles": sorted(set(titles.get(code, [])))[:12],
    })

meta = {
    "source": "Jobs and Skills Australia, Occupation profiles data (February 2026), ANZSCO basis",
    "sourceUrl": "https://www.jobsandskills.gov.au/data/occupation-and-industry-profiles",
    "earnings": "ABS Survey of Employee Earnings and Hours, May 2025, customised report: median weekly and hourly pay for full-time non-managerial employees paid at the adult rate, before tax and salary sacrifice",
    "licence": "CC BY 4.0, (c) Commonwealth of Australia",
}
with open(dest, "w") as f:
    json.dump({"meta": meta, "occupations": occupations}, f, indent=1, ensure_ascii=False)
print(f"{len(occupations)} occupations written to {dest}")
