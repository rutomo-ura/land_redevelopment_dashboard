"""Write ownership sidebar metrics from the Ownership Overview reference layer."""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
OWNERSHIP_SERVICE_URL = (
    "https://services1.arcgis.com/0DMNBNaacQNEfN4H/arcgis/rest/services/"
    "gisdb_gis_epp_parcels_full/FeatureServer/0/query"
)
OWNERSHIP_GROUPS = ["City Owned", "URA Owned", "PLB Owned"]
OUTPUTS = [
    REPO_ROOT / "docs" / "data" / "ownership_analysis.json",
    REPO_ROOT / "webmap" / "data" / "ownership_analysis.json",
]


def fetch_reference_rows() -> list[dict[str, object]]:
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
                },
                {
                    "statisticType": "sum",
                    "onStatisticField": "parcel_sqft",
                    "outStatisticFieldName": "parcel_sqft",
                },
            ],
            separators=(",", ":"),
        ),
    }
    url = f"{OWNERSHIP_SERVICE_URL}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=30) as response:
        data = json.loads(response.read().decode("utf-8"))

    if "error" in data:
        raise RuntimeError(data["error"])

    return [feature["attributes"] for feature in data.get("features", [])]


def build_summary(rows: list[dict[str, object]]) -> dict[str, object]:
    by_group = {str(row.get("inventory_type")): row for row in rows}
    groups = []

    for group in OWNERSHIP_GROUPS:
        row = by_group.get(group, {})
        parcel_count = int(row.get("parcel_count") or 0)
        parcel_sqft = float(row.get("parcel_sqft") or 0)
        groups.append(
            {
                "label": group,
                "value": parcel_count,
                "acres": round(parcel_sqft / 43560, 2),
                "source": "Ownership Overview reference layer",
            }
        )

    return {
        "source": {
            "name": "Ownership Overview",
            "serviceUrl": OWNERSHIP_SERVICE_URL.replace("/query", ""),
            "groupField": "inventory_type",
            "areaField": "parcel_sqft",
        },
        "groups": groups,
        "kpis": {
            "referencePublicParcels": sum(group["value"] for group in groups),
            "referencePublicAcres": round(sum(group["acres"] for group in groups), 2),
        },
    }


def main() -> None:
    summary = build_summary(fetch_reference_rows())
    text = json.dumps(summary, ensure_ascii=False, indent=2)

    for output in OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(text, encoding="utf-8")
        print(f"Wrote {output}")


if __name__ == "__main__":
    main()
