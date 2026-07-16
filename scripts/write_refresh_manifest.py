"""Write the dashboard refresh manifest consumed by the source-freshness panel."""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = [
    ROOT / "docs" / "data" / "refresh_manifest.json",
    ROOT / "webmap" / "data" / "refresh_manifest.json",
]

SOURCE_SPECS = [
    ("vacant", "Vacant-land parcel and assessment bundle", ROOT / "docs" / "data" / "vacant_land_triage.geojson"),
    ("epp", "PostgreSQL gis.epp_parcels_full", ROOT / "exports" / "epp_parcel_attributes.csv"),
    ("tax", "PostgreSQL gis.city_tax_delinquent_3yr", ROOT / "exports" / "live_postgres_tax_delinquency_3yr.csv"),
    ("tolemi", "Tolemi BuildingBlocks export", ROOT / "exports" / "tolemi_building_tax_delinquency_status.csv"),
    ("pli", "WPRDC Condemned and Dead-End Properties", ROOT / "exports" / "wprdc_condemned_properties.csv"),
    ("boundaries", "WPRDC City neighborhoods and 2022 Council districts", ROOT / "docs" / "data" / "boundary_analysis.json"),
    ("derived", "Dashboard build pipeline", ROOT / "docs" / "data" / "vacant_land_triage.geojson"),
]


def modified_date(path: Path) -> str | None:
    if not path.exists():
        return None
    return datetime.fromtimestamp(path.stat().st_mtime).astimezone().date().isoformat()


def feature_count(path: Path) -> int:
    payload = json.loads(path.read_text(encoding="utf-8-sig"))
    features = payload.get("features")
    if not isinstance(features, list):
        raise ValueError(f"GeoJSON features missing from {path}")
    return len(features)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--qa-status", choices=["RUNNING", "PASS"], default="RUNNING")
    args = parser.parse_args()

    now = datetime.now().astimezone()
    parcel_path = ROOT / "docs" / "data" / "vacant_land_triage.geojson"
    sources = [
        {
            "key": key,
            "label": label,
            "lastUpdated": modified_date(path),
            "artifact": str(path.relative_to(ROOT)).replace("\\", "/"),
        }
        for key, label, path in SOURCE_SPECS
    ]
    missing = [source["artifact"] for source in sources if not source["lastUpdated"]]
    if missing:
        raise FileNotFoundError(f"Refresh manifest sources are missing: {', '.join(missing)}")

    manifest = {
        "schemaVersion": 1,
        "app": "vacant-land-redevelopment-explorer",
        "generatedAt": now.isoformat(),
        "generatedOn": now.date().isoformat(),
        "timezone": "America/New_York",
        "qaStatus": args.qa_status,
        "parcelCount": feature_count(parcel_path),
        "sources": sources,
    }
    text = json.dumps(manifest, indent=2) + "\n"
    for output in OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(text, encoding="utf-8")
        print(f"Wrote {output}")


if __name__ == "__main__":
    main()
