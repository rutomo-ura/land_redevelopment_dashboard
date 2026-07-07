import csv
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPORTS = ROOT / "exports"


def normalize_tolemi_pin(pin: str) -> str | None:
    parts = (pin or "").strip().upper().split("-")
    if len(parts) < 3:
        return None
    block, letter, lot = parts[:3]
    if not block.isdigit() or len(letter) != 1:
        return None
    base = f"{int(block):04d}{letter}{int(lot):05d}"
    suffix_parts = parts[3:]
    if not suffix_parts:
        suffix_part = "000000"
    elif len(suffix_parts) == 1:
        suffix = suffix_parts[0]
        suffix_part = f"{int(suffix):04d}00" if suffix.isdigit() else f"{suffix:0>4}00"
    else:
        suffix_a, suffix_b = suffix_parts[:2]
        suffix_part = f"{suffix_a:0>4}{int(suffix_b):02d}" if suffix_b.isdigit() else f"{suffix_a:0>4}{suffix_b:0>2}"
    return f"{base}{suffix_part}"


def load_tolemi():
    path = EXPORTS / "tolemi_building_tax_delinquency_status.csv"
    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        row["normalized_par_pin"] = normalize_tolemi_pin(row["parcel_id"])
    return rows


def load_geojson(name):
    text = (EXPORTS / name).read_text(encoding="utf-8-sig")
    data = json.loads(text)
    return [feature["properties"] for feature in data.get("features", [])]


def main():
    tolemi = load_tolemi()
    broad = load_geojson("vacant_land_broad.geojson")
    focused = load_geojson("vacant_land_focused.geojson")

    tolemi_pins = {row["normalized_par_pin"] for row in tolemi if row["normalized_par_pin"]}
    broad_pins = {row["par_pin"] for row in broad}
    focused_pins = {row["par_pin"] for row in focused}

    tolemi_land_pins = {
        row["normalized_par_pin"]
        for row in tolemi
        if row["normalized_par_pin"] and row["property_type"] == "Land"
    }
    tolemi_structure_pins = {
        row["normalized_par_pin"]
        for row in tolemi
        if row["normalized_par_pin"] and row["property_type"] == "Structure"
    }

    broad_prior_ge3 = {
        row["par_pin"]
        for row in broad
        if row.get("prior_years") not in (None, "") and float(row["prior_years"]) >= 3
    }
    broad_prior_ge5 = {
        row["par_pin"]
        for row in broad
        if row.get("prior_years") not in (None, "") and float(row["prior_years"]) >= 5
    }

    stats = {
        "pin_normalization_note": (
            "Tolemi display PINs were normalized as BBBB + letter + 5-digit lot + "
            "4-digit suffix + 00, inferred from local par_pin examples."
        ),
        "tolemi": {
            "rows": len(tolemi),
            "normalized_pin_rows": len(tolemi_pins),
            "property_type": dict(Counter(row["property_type"] or "(blank)" for row in tolemi)),
            "tax_years_delinquent_city": dict(Counter(row["tax_years_delinquent_city"] or "(blank)" for row in tolemi)),
            "usps_is_flagged_vacant": dict(Counter(row["usps_is_flagged_vacant"] or "(blank)" for row in tolemi)),
        },
        "postgres_snapshot_exports": {
            "vacant_land_broad_features": len(broad),
            "vacant_land_focused_features": len(focused),
            "broad_prior_years_ge3": len(broad_prior_ge3),
            "broad_prior_years_ge5": len(broad_prior_ge5),
            "broad_taxdesc": dict(Counter(row.get("taxdesc") or "(blank)" for row in broad)),
            "focused_taxdesc": dict(Counter(row.get("taxdesc") or "(blank)" for row in focused)),
        },
        "overlap": {
            "tolemi_any_in_broad_vacant_land": len(tolemi_pins & broad_pins),
            "tolemi_land_in_broad_vacant_land": len(tolemi_land_pins & broad_pins),
            "tolemi_structure_in_broad_vacant_land": len(tolemi_structure_pins & broad_pins),
            "tolemi_any_in_focused_candidates": len(tolemi_pins & focused_pins),
            "tolemi_land_in_focused_candidates": len(tolemi_land_pins & focused_pins),
            "tolemi_land_in_broad_prior_ge3": len(tolemi_land_pins & broad_prior_ge3),
            "tolemi_land_in_broad_prior_ge5": len(tolemi_land_pins & broad_prior_ge5),
            "broad_vacant_land_not_in_tolemi_delinquent": len(broad_pins - tolemi_pins),
            "focused_candidates_not_in_tolemi_delinquent": len(focused_pins - tolemi_pins),
            "tolemi_delinquent_not_in_broad_vacant_land": len(tolemi_pins - broad_pins),
        },
    }

    out_json = EXPORTS / "tolemi_postgres_diff_summary.json"
    out_md = EXPORTS / "tolemi_postgres_diff_summary.md"
    out_json.write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")

    md = f"""# Tolemi vs Postgres Export Diff

Generated from local exports on the current workspace.

## Source Scope

- Tolemi export: `{stats['tolemi']['rows']:,}` tax-delinquent parcels from BuildingBlocks (`filter3451 = Yes`).
- Postgres broad export: `{stats['postgres_snapshot_exports']['vacant_land_broad_features']:,}` vacant-land features from `gis.calculated_vacant_land`.
- Postgres focused export/high-priority candidates: `{stats['postgres_snapshot_exports']['vacant_land_focused_features']:,}` taxable vacant-land candidates with prior-year signal.

## Key Diff

- Tolemi has `{stats['tolemi']['property_type'].get('Structure', 0):,}` delinquent structures and `{stats['tolemi']['property_type'].get('Land', 0):,}` delinquent land parcels.
- Postgres broad vacant-land export has `{stats['postgres_snapshot_exports']['broad_prior_years_ge3']:,}` vacant-land parcels with `prior_years >= 3` and `{stats['postgres_snapshot_exports']['broad_prior_years_ge5']:,}` with `prior_years >= 5`.
- Normalized PIN overlap: `{stats['overlap']['tolemi_land_in_broad_vacant_land']:,}` Tolemi delinquent land parcels appear in the broad vacant-land export.
- Normalized PIN overlap: `{stats['overlap']['tolemi_land_in_focused_candidates']:,}` Tolemi delinquent land parcels appear in focused candidates.
- Tolemi delinquent parcels not in broad vacant-land export: `{stats['overlap']['tolemi_delinquent_not_in_broad_vacant_land']:,}`. This is expected because Tolemi includes structures and the Postgres export is vacant-land scoped.

## Caveats

- Live Postgres was not reachable from this shell because `PGHOST`, `PGDATABASE`, and `PGUSER` were unset and local `psql -w` failed with `no password supplied`.
- PIN normalization is inferred from local `par_pin` examples; validate against an assessment crosswalk before treating parcel-level non-overlap as final.
"""
    out_md.write_text(md, encoding="utf-8")
    print(json.dumps({"summary_json": str(out_json), "summary_md": str(out_md), **stats["overlap"]}, indent=2))


if __name__ == "__main__":
    main()
