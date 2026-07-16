"""Fail closed when a daily dashboard build is incomplete, stale, or malformed."""

from __future__ import annotations

import argparse
import json
from datetime import date, datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOCS_GEOJSON = ROOT / "docs" / "data" / "vacant_land_triage.geojson"
WEBMAP_GEOJSON = ROOT / "webmap" / "data" / "vacant_land_triage.geojson"
DOCS_MANIFEST = ROOT / "docs" / "data" / "refresh_manifest.json"
WEBMAP_MANIFEST = ROOT / "webmap" / "data" / "refresh_manifest.json"
REQUIRED_SOURCE_KEYS = {"vacant", "epp", "tax", "tolemi", "pli", "boundaries", "derived"}


def load_json(path: Path) -> dict:
    if not path.exists():
        raise ValueError(f"Required output is missing: {path}")
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected-date", default=date.today().isoformat())
    parser.add_argument("--minimum-parcels", type=int, default=20_000)
    parser.add_argument("--max-source-age-days", type=int, default=2)
    args = parser.parse_args()

    if DOCS_GEOJSON.read_bytes() != WEBMAP_GEOJSON.read_bytes():
        raise ValueError("docs and webmap parcel GeoJSON files differ")
    if DOCS_MANIFEST.read_bytes() != WEBMAP_MANIFEST.read_bytes():
        raise ValueError("docs and webmap refresh manifests differ")

    geojson = load_json(DOCS_GEOJSON)
    features = geojson.get("features")
    if not isinstance(features, list) or len(features) < args.minimum_parcels:
        raise ValueError(f"Parcel feature count is below the QA floor: {len(features or [])}")

    pins: set[str] = set()
    duplicate_count = 0
    missing_pin_count = 0
    missing_geometry_count = 0
    for feature in features:
        properties = feature.get("properties") or {}
        pin = str(properties.get("par_pin") or "").strip()
        if not pin:
            missing_pin_count += 1
        elif pin in pins:
            duplicate_count += 1
        else:
            pins.add(pin)
        if not feature.get("geometry"):
            missing_geometry_count += 1
    if duplicate_count or missing_pin_count or missing_geometry_count:
        raise ValueError(
            "Parcel QA failed: "
            f"duplicates={duplicate_count}, missing_pin={missing_pin_count}, "
            f"missing_geometry={missing_geometry_count}"
        )

    manifest = load_json(DOCS_MANIFEST)
    if manifest.get("generatedOn") != args.expected_date:
        raise ValueError(
            f"Manifest generatedOn must be {args.expected_date}; got {manifest.get('generatedOn')!r}"
        )
    if manifest.get("parcelCount") != len(features):
        raise ValueError("Manifest parcelCount does not match the parcel GeoJSON")

    sources = manifest.get("sources")
    if not isinstance(sources, list):
        raise ValueError("Manifest sources must be an array")
    source_keys = {str(source.get("key")) for source in sources}
    if source_keys != REQUIRED_SOURCE_KEYS:
        raise ValueError(f"Manifest source keys are incomplete: {sorted(source_keys)}")

    expected = datetime.strptime(args.expected_date, "%Y-%m-%d").date()
    stale = []
    for source in sources:
        updated_text = source.get("lastUpdated")
        if not updated_text:
            stale.append(f"{source.get('key')}: missing date")
            continue
        updated = datetime.strptime(str(updated_text), "%Y-%m-%d").date()
        age = (expected - updated).days
        if age < 0 or age > args.max_source_age_days:
            stale.append(f"{source.get('key')}: {updated_text} ({age} days old)")
    if stale:
        raise ValueError("Source freshness QA failed: " + "; ".join(stale))

    print(
        "PASS: "
        f"{len(features):,} unique parcels, 7 current sources, "
        "matching docs/webmap outputs"
    )


if __name__ == "__main__":
    main()
