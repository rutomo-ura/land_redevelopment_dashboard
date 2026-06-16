r"""Build the public web-app GeoJSON with property-use groups.

The public bundle keeps parcel identifiers and triage fields, but omits owner
names. It combines the already reviewed residential public layer with the
broader vacant-land export so commercial, industrial, public/institutional, and
other parcels can be filtered in the app.
"""

from __future__ import annotations

import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
RESIDENTIAL_SOURCE = REPO_ROOT / "docs" / "data" / "vacant_land_residential_triage.geojson"
BROAD_SOURCE = REPO_ROOT / "exports" / "vacant_land_broad.geojson"
OUTPUTS = [
    REPO_ROOT / "docs" / "data" / "vacant_land_triage.geojson",
    REPO_ROOT / "webmap" / "data" / "vacant_land_triage.geojson",
]

PUBLIC_FIELDS = [
    "par_pin",
    "taxdesc",
    "usedesc",
    "use_group",
    "prior_band",
    "prior_years",
    "par_calcacreag",
    "fairmarkettotal",
    "city_neighborhood",
    "council_district",
    "council_district_label",
]

RESIDENTIAL_USES = {
    "VACANT LAND",
    "BUILDERS LOT",
    "SINGLE FAMILY",
    "TWO FAMILY",
    "THREE FAMILY",
    "FOUR FAMILY",
    "ROWHOUSE",
    "TOWNHOUSE",
    "RES AUX BUILDING (NO HOUSE)",
    "CONDO DEVELOPMENTAL LAND",
}

COMMERCIAL_USES = {
    "VACANT COMMERCIAL LAND",
    "COMM AUX BUILDING",
    "COMMERCIAL GARAGE",
    "PARKING GARAGE/LOTS",
    "CONDOMINIUM OFFICE BUILDING",
    "OFFICE-ELEVATOR -3 + STORIES",
}

INDUSTRIAL_USES = {
    "VACANT INDUSTRIAL LAND",
    "LIGHT MANUFACTURING",
    "DISTRIBUTION WAREHOUSE",
    "WAREHOUSE",
    "WAREHOUSE/MULTI-TENANT",
    "MINI WAREHOUSE",
    "OFFICE/WAREHOUSE",
}

PUBLIC_INSTITUTIONAL_USES = {
    "MUNICIPAL GOVERNMENT",
    "MUNICIPAL URBAN RENEWAL",
    "COMMUNITY URBAN RENEWAL",
    "MUNICIPAL IMPROVEMENT",
    "COUNTY GOVERNMENT",
    "STATE GOVERNMENT",
    "FEDERAL GOVERNMENT",
    "TOWNSHIP GOVERNMENT",
    "OWNED BY BOARD OF EDUCATION",
    "OWNED BY COLLEGE/UNIV/ACADEMY",
    "OWNED BY METRO HOUSING AU",
    "PUBLIC PARK",
    "CHURCHES, PUBLIC WORSHIP",
    "CHARITABLE EXEMPTION/HOS/HOMES",
}

INFRASTRUCTURE_USES = {
    "R.R. - USED IN OPERATION",
    "R.R. - NOT USED IN OPERATION",
    "COMMERCIAL/UTILITY",
    "RIGHT OF WAY - RESIDENTIAL",
    "RIGHT OF WAY - COMMERCIAL",
    "RETENTION POND - RESIDENTIAL",
    "AIR RIGHTS",
    "CEMETERY/MONUMENTS",
}


def prior_band(value: object) -> str:
    try:
        years = int(value or 0)
    except (TypeError, ValueError):
        years = 0

    if years <= 0:
        return "No known prior years"
    if years <= 4:
        return "1-4 prior years"
    if years <= 10:
        return "5-10 prior years"
    return "11+ prior years"


def use_group(usedesc: object) -> str:
    desc = str(usedesc or "").strip().upper()

    if desc in RESIDENTIAL_USES or desc.startswith("APART:"):
        return "Residential"
    if desc in COMMERCIAL_USES:
        return "Commercial"
    if desc in INDUSTRIAL_USES:
        return "Industrial"
    if desc in PUBLIC_INSTITUTIONAL_USES:
        return "Public / institutional"
    if desc in INFRASTRUCTURE_USES:
        return "Infrastructure / utility"
    return "Other / review"


def load_features(path: Path) -> list[dict[str, object]]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    return data.get("features", [])


def sanitize_feature(feature: dict[str, object]) -> dict[str, object]:
    properties = dict(feature.get("properties") or {})
    properties["prior_band"] = properties.get("prior_band") or prior_band(properties.get("prior_years"))
    properties["use_group"] = use_group(properties.get("usedesc"))

    return {
        "type": "Feature",
        "geometry": feature.get("geometry"),
        "properties": {field: properties.get(field) for field in PUBLIC_FIELDS},
    }


def main() -> None:
    features_by_pin: dict[str, dict[str, object]] = {}

    for source in [RESIDENTIAL_SOURCE, BROAD_SOURCE]:
        for feature in load_features(source):
            sanitized = sanitize_feature(feature)
            pin = str(sanitized["properties"].get("par_pin") or "")
            if not pin:
                continue
            features_by_pin.setdefault(pin, sanitized)

    features = list(features_by_pin.values())
    features.sort(key=lambda item: str(item["properties"].get("par_pin") or ""))

    collection = {
        "type": "FeatureCollection",
        "features": features,
    }

    text = json.dumps(collection, separators=(",", ":"), ensure_ascii=False)
    for output in OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(text, encoding="utf-8")
        print(f"Wrote {output} with {len(features):,} features")


if __name__ == "__main__":
    main()
