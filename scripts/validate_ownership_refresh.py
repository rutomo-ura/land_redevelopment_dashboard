"""Validate refreshed public data before publishing."""

from __future__ import annotations

import csv
import json
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_GEOJSON = REPO_ROOT / "docs" / "data" / "vacant_land_triage.geojson"
OWNERSHIP_SUMMARY = REPO_ROOT / "docs" / "data" / "ownership_analysis.json"
QA_DIR = REPO_ROOT / "outputs" / "qa"
QA_MARKDOWN = REPO_ROOT / "docs" / "latest_ownership_qa.md"
OWNERSHIP_SERVICE_URL = (
    "https://services1.arcgis.com/0DMNBNaacQNEfN4H/arcgis/rest/services/"
    "gisdb_gis_epp_parcels_full/FeatureServer/0/query"
)
OWNERSHIP_GROUPS = ["City Owned", "URA Owned", "PLB Owned"]


def load_public_features() -> list[dict[str, object]]:
    data = json.loads(PUBLIC_GEOJSON.read_text(encoding="utf-8-sig"))
    return data.get("features", [])


def fetch_reference_counts() -> dict[str, int]:
    quoted_groups = ", ".join(f"'{group}'" for group in OWNERSHIP_GROUPS)
    params = {
        "f": "json",
        "where": f"inventory_type IN ({quoted_groups})",
        "returnGeometry": "false",
        "groupByFieldsForStatistics": "inventory_type",
        "outStatistics": json.dumps(
            [
                {
                    "statisticType": "count",
                    "onStatisticField": "OBJECTID",
                    "outStatisticFieldName": "parcel_count",
                }
            ],
            separators=(",", ":"),
        ),
    }
    url = f"{OWNERSHIP_SERVICE_URL}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=30) as response:
        data = json.loads(response.read().decode("utf-8"))

    if "error" in data:
        raise RuntimeError(data["error"])

    return {
        feature["attributes"]["inventory_type"]: int(feature["attributes"]["parcel_count"] or 0)
        for feature in data.get("features", [])
    }


def load_ownership_summary_counts() -> dict[str, int]:
    data = json.loads(OWNERSHIP_SUMMARY.read_text(encoding="utf-8-sig"))
    return {
        str(group.get("label")): int(group.get("value") or 0)
        for group in data.get("groups", [])
    }


def write_csv(path: Path, rows: list[dict[str, object]], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    features = load_public_features()
    reference_counts = fetch_reference_counts()
    summary_counts = load_ownership_summary_counts()
    public_counts: Counter[str] = Counter()
    pins: Counter[str] = Counter()
    missing_geometry = []
    missing_pin = []

    for feature in features:
        properties = feature.get("properties") or {}
        group = str(properties.get("ownership_group") or "")
        pin = str(properties.get("par_pin") or "").strip()
        if group in OWNERSHIP_GROUPS:
            public_counts[group] += 1
        if pin:
            pins[pin] += 1
        else:
            missing_pin.append({"ownership_group": group})
        if not feature.get("geometry"):
            missing_geometry.append({"par_pin": pin, "ownership_group": group})

    summary_mismatches = []
    for group in OWNERSHIP_GROUPS:
        summary_value = summary_counts.get(group, 0)
        reference_value = reference_counts.get(group, 0)
        if summary_value != reference_value:
            summary_mismatches.append(
                {
                    "ownership_group": group,
                    "ownership_summary": summary_value,
                    "reference_layer": reference_value,
                    "difference": summary_value - reference_value,
                }
            )

    duplicate_pins = [
        {"par_pin": pin, "records": count}
        for pin, count in pins.items()
        if count > 1
    ]

    QA_DIR.mkdir(parents=True, exist_ok=True)
    write_csv(
        QA_DIR / "ownership_summary_mismatches.csv",
        summary_mismatches,
        ["ownership_group", "ownership_summary", "reference_layer", "difference"],
    )
    write_csv(
        QA_DIR / "public_geojson_ownership_subset_counts.csv",
        [
            {
                "ownership_group": group,
                "public_geojson_subset": public_counts.get(group, 0),
                "reference_layer": reference_counts.get(group, 0),
            }
            for group in OWNERSHIP_GROUPS
        ],
        ["ownership_group", "public_geojson_subset", "reference_layer"],
    )
    write_csv(QA_DIR / "duplicate_public_parcels.csv", duplicate_pins, ["par_pin", "records"])
    write_csv(QA_DIR / "missing_public_geometry.csv", missing_geometry, ["par_pin", "ownership_group"])

    passed = not summary_mismatches and not duplicate_pins and not missing_geometry and not missing_pin
    status = "PASS" if passed else "FAIL"
    lines = [
        "# Latest Ownership QA",
        "",
        f"Status: {status}",
        "",
        "| Check | Result |",
        "| --- | ---: |",
        f"| Public GeoJSON features | {len(features):,} |",
        f"| Ownership summary mismatches vs reference | {len(summary_mismatches):,} |",
        f"| Duplicate parcel IDs | {len(duplicate_pins):,} |",
        f"| Missing parcel IDs | {len(missing_pin):,} |",
        f"| Missing geometries | {len(missing_geometry):,} |",
        "",
        "Ownership source: Ownership Overview layer, grouped by `inventory_type`.",
        "Vacant-land GeoJSON is validated for IDs and geometry, not used as the ownership source.",
    ]
    QA_MARKDOWN.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))

    if not passed:
        raise SystemExit("Ownership refresh validation failed.")


if __name__ == "__main__":
    main()
