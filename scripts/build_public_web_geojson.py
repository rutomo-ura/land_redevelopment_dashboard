r"""Build the public web-app GeoJSON with property-use groups.

The internal staff bundle keeps parcel identifiers, screening fields, and owner
names for spreadsheet review. It combines the already reviewed residential
public layer with the broader vacant-land export so commercial, industrial,
public/institutional, and other parcels can be filtered in the app.

PLI hazard bands are joined from the public WPRDC Condemned and Dead-End
Properties dataset (latest_inspection_score) on Allegheny parcel PIN.

Tolemi tax-sale vacant-lot scores are joined from the BuildingBlocks export
(tax_sale_vacant_lot_score) for denser vacant-land prioritization coloring.
"""

from __future__ import annotations

import csv
import json
import urllib.request
from collections import Counter
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
RESIDENTIAL_SOURCE = REPO_ROOT / "docs" / "data" / "vacant_land_residential_triage.geojson"
BROAD_SOURCE = REPO_ROOT / "exports" / "vacant_land_broad.geojson"
EXISTING_PUBLIC_SOURCE = REPO_ROOT / "docs" / "data" / "vacant_land_triage.geojson"
WPRDC_CONDEMNED_CACHE = REPO_ROOT / "exports" / "wprdc_condemned_properties.csv"
WPRDC_CONDEMNED_URL = (
    "https://data.wprdc.org/datastore/dump/0a963f26-eb4b-4325-bbbc-3ddf6a871410"
)
TOLEMI_TAX_STATUS_CSV = REPO_ROOT / "exports" / "tolemi_building_tax_delinquency_status.csv"
OUTPUTS = [
    REPO_ROOT / "docs" / "data" / "vacant_land_triage.geojson",
    REPO_ROOT / "webmap" / "data" / "vacant_land_triage.geojson",
]

PUBLIC_FIELDS = [
    "par_pin",
    "parcel_label",
    "propertyowner",
    "taxdesc",
    "usedesc",
    "use_group",
    "ownership_group",
    "control_path",
    "prior_band",
    "prior_years",
    "par_calcacreag",
    "fairmarkettotal",
    "city_neighborhood",
    "council_district",
    "council_district_label",
    "is_condemned",
    "condemned_flag",
    "condemned_status",
    "condemned_score_band",
    "pli_hazard_score",
    "pli_hazard_band",
    "tax_sale_vacant_lot_score",
    "vacant_lot_score_band",
    "centroid_lat",
    "centroid_lng",
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

EXCLUDED_DASHBOARD_USES = INFRASTRUCTURE_USES | {
    "AIR RIGHTS",
    "RIGHT OF WAY - RESIDENTIAL",
    "RIGHT OF WAY - COMMERCIAL",
    "RETENTION POND - RESIDENTIAL",
}

# PLI engagement scale is 1-4. WPRDC currently publishes 0-4 (0 = passed).
# If legacy 5-62 values reappear, map them into 1-4 by quartile breakpoints.
LEGACY_SCORE_BREAKPOINTS = (16, 31, 46)


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


def include_dashboard_feature(properties: dict[str, object]) -> bool:
    desc = str(properties.get("usedesc") or "").strip().upper()
    if desc in EXCLUDED_DASHBOARD_USES:
        return False
    if str(properties.get("use_group") or "").strip() == "Infrastructure / utility":
        return False
    return True


def _compact(value: object) -> str:
    return "".join(char for char in str(value or "").upper() if char.isalnum())


def normalize_pin(value: object) -> str:
    pin = "".join(char for char in str(value or "").upper() if char.isalnum())
    if not pin:
        return ""
    if len(pin) < 16:
        pin = pin.zfill(16)
    return pin[:16]


def normalize_tolemi_pin(value: object) -> str | None:
    """Convert Tolemi parcel_id forms like 14-L-25 into 16-char Allegheny PIN."""
    text = str(value or "").strip().upper()
    if not text:
        return None
    if "-" not in text:
        pin = normalize_pin(text)
        return pin or None

    parts = text.split("-")
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
        suffix_part = (
            f"{suffix_a:0>4}{int(suffix_b):02d}"
            if suffix_b.isdigit()
            else f"{suffix_a:0>4}{suffix_b:0>2}"
        )
    return f"{base}{suffix_part}"


def ownership_group(properties: dict[str, object]) -> str:
    owner = _compact(properties.get("propertyowner"))
    desc = str(properties.get("usedesc") or "").strip().upper()
    group = use_group(properties.get("usedesc"))

    if "PITTSBURGHLANDBANK" in owner:
        return "PLB Owned"
    if "URBANREDEVELOPMENTAUTHORITYOFPITTSBURGH" in owner:
        return "URA Owned"
    if "CITYOFPITTSBURGH" in owner:
        return "City Owned"
    if "HOUSINGAUTHORITYCITYOFPITTSBURGH" in owner or "HACP" in owner:
        return "HACP Owned"

    public_owner_tokens = [
        "COMMONWEALTHOFPENNSYLVANIA",
        "ALLEGHENYCOUNTY",
        "FEDERAL",
        "PORTAUTHORITY",
        "PITTSBURGHPARKINGAUTHORITY",
        "PARKINGAUTHORITYOFPITTSBURGH",
        "SCHOOLDISTRICT",
        "BOARDOFPUBLICEDUCATION",
        "SANITARYAUTHORITY",
        "SPORTSEXHIBITIONAUTHORITY",
        "REDEVELOPMENTAUTHORITYOFALLEGHENYCOUNTY",
    ]
    if any(token in owner for token in public_owner_tokens):
        return "Other Public / Institutional"

    if desc in {"MUNICIPAL GOVERNMENT", "MUNICIPAL IMPROVEMENT"}:
        return "City Owned"
    if desc in {"MUNICIPAL URBAN RENEWAL", "COMMUNITY URBAN RENEWAL"}:
        return "URA Owned"
    if desc == "OWNED BY METRO HOUSING AU":
        return "HACP Owned"
    if group == "Public / institutional":
        return "Other Public / Institutional"
    return "Private / Other"


def control_path(properties: dict[str, object], owner_group: str) -> str:
    taxdesc = str(properties.get("taxdesc") or "")
    try:
        prior_years = int(properties.get("prior_years") or 0)
    except (TypeError, ValueError):
        prior_years = 0

    if owner_group in {"City Owned", "URA Owned", "PLB Owned", "HACP Owned"}:
        return "Existing public control"
    if owner_group == "Other Public / Institutional":
        return "Public or institutional review"
    if taxdesc == "20 - Taxable" and prior_years >= 3:
        return "Private acquisition review"
    return "Private or monitor"


def parcel_label(value: object) -> str | None:
    pin = str(value or "").strip().upper()
    if len(pin) < 10:
        return pin or None

    ward = pin[:4].lstrip("0") or "0"
    block = pin[4]
    lot = pin[5:10].lstrip("0") or "0"
    suffix = pin[10:].strip("0")
    return f"{ward}-{block}-{lot}{suffix}"


def normalize_pli_score(raw: object) -> int | None:
    """Map WPRDC latest_inspection_score to official PLI 1-4 hazard bands.

    Current WPRDC values are 0-4 (0 = passed inspection). Legacy notes mention
    0-62; if those reappear, quartile breakpoints map them into 1-4.
    """
    if raw is None or str(raw).strip() == "":
        return None
    try:
        score = int(float(str(raw).strip()))
    except (TypeError, ValueError):
        return None

    if score <= 0:
        return None
    if 1 <= score <= 4:
        return score
    if score <= LEGACY_SCORE_BREAKPOINTS[0]:
        return 1
    if score <= LEGACY_SCORE_BREAKPOINTS[1]:
        return 2
    if score <= LEGACY_SCORE_BREAKPOINTS[2]:
        return 3
    return 4


def pli_hazard_band(score: int | None) -> str:
    if score is None:
        return "Not scored"
    return f"Score {score}"


def vacant_lot_score_band(score: float | None) -> str:
    if score is None:
        return "Not scored"
    if score >= 75:
        return "High (75-100)"
    if score >= 50:
        return "Medium (50-74)"
    if score >= 25:
        return "Low (25-49)"
    return "Very low (0-24)"


def parse_tolemi_score(raw: object) -> float | None:
    if raw is None or str(raw).strip() == "":
        return None
    try:
        return float(str(raw).strip())
    except (TypeError, ValueError):
        return None


def ensure_wprdc_condemned_csv(path: Path = WPRDC_CONDEMNED_CACHE) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 0:
        return path
    print(f"Downloading WPRDC condemned properties CSV to {path}")
    with urllib.request.urlopen(WPRDC_CONDEMNED_URL, timeout=120) as response:
        path.write_bytes(response.read())
    return path


def load_pli_hazard_by_pin(path: Path | None = None) -> dict[str, int]:
    csv_path = ensure_wprdc_condemned_csv(path or WPRDC_CONDEMNED_CACHE)
    best: dict[str, int] = {}
    with csv_path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            pin = normalize_pin(row.get("parcel_id"))
            score = normalize_pli_score(row.get("latest_inspection_score"))
            if not pin or score is None:
                continue
            previous = best.get(pin)
            if previous is None or score > previous:
                best[pin] = score
    return best


def load_tolemi_vacant_lot_scores(path: Path = TOLEMI_TAX_STATUS_CSV) -> dict[str, float]:
    if not path.exists():
        print(f"Tolemi export not found at {path}; vacant-lot scores will be Not scored")
        return {}

    best: dict[str, float] = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            pin = normalize_tolemi_pin(row.get("parcel_id"))
            score = parse_tolemi_score(row.get("tax_sale_vacant_lot_score"))
            if not pin or score is None:
                continue
            previous = best.get(pin)
            if previous is None or score > previous:
                best[pin] = score
    return best


def load_features(path: Path) -> list[dict[str, object]]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    return data.get("features", [])


def apply_pli_hazard(properties: dict[str, object], pli_by_pin: dict[str, int]) -> None:
    pin = normalize_pin(properties.get("par_pin"))
    score = pli_by_pin.get(pin)
    band = pli_hazard_band(score)
    properties["pli_hazard_score"] = score
    properties["pli_hazard_band"] = band
    if score is not None:
        properties["is_condemned"] = True
        properties["condemned_flag"] = "Condemned overlap"
        properties["condemned_status"] = "Condemned overlap"
        properties["condemned_score_band"] = band
    else:
        properties["is_condemned"] = False
        properties["condemned_flag"] = "Not flagged"
        properties["condemned_status"] = "Not flagged"
        properties["condemned_score_band"] = "Not scored"


def apply_tolemi_vacant_lot_score(
    properties: dict[str, object],
    tolemi_by_pin: dict[str, float],
) -> None:
    pin = normalize_pin(properties.get("par_pin"))
    score = tolemi_by_pin.get(pin)
    properties["tax_sale_vacant_lot_score"] = None if score is None else round(score, 2)
    properties["vacant_lot_score_band"] = vacant_lot_score_band(score)


def geometry_centroid(geometry: dict[str, object] | None) -> tuple[float, float] | None:
    if not geometry:
        return None
    coords = geometry.get("coordinates")
    geom_type = geometry.get("type")
    points: list[tuple[float, float]] = []

    def collect(value: object) -> None:
        if (
            isinstance(value, list)
            and len(value) >= 2
            and isinstance(value[0], (int, float))
            and isinstance(value[1], (int, float))
        ):
            points.append((float(value[0]), float(value[1])))
            return
        if isinstance(value, list):
            for item in value:
                collect(item)

    if geom_type in {"Polygon", "MultiPolygon"} and coords is not None:
        collect(coords)
    if not points:
        return None
    return (
        sum(point[0] for point in points) / len(points),
        sum(point[1] for point in points) / len(points),
    )


def apply_centroid(properties: dict[str, object], geometry: dict[str, object] | None) -> None:
    point = geometry_centroid(geometry)
    if not point:
        properties["centroid_lng"] = None
        properties["centroid_lat"] = None
        return
    lng, lat = point
    properties["centroid_lng"] = round(lng, 6)
    properties["centroid_lat"] = round(lat, 6)


def sanitize_feature(
    feature: dict[str, object],
    pli_by_pin: dict[str, int],
    tolemi_by_pin: dict[str, float],
) -> dict[str, object]:
    properties = dict(feature.get("properties") or {})
    properties["prior_band"] = properties.get("prior_band") or prior_band(properties.get("prior_years"))
    properties["use_group"] = use_group(properties.get("usedesc"))
    # Preserve ownership/control when rebuilding from the already-sanitized public bundle
    # unless owner is present and groups should be recomputed.
    if properties.get("propertyowner") or not properties.get("ownership_group"):
        properties["ownership_group"] = ownership_group(properties)
    if properties.get("propertyowner") or not properties.get("control_path"):
        properties["control_path"] = control_path(properties, str(properties["ownership_group"]))
    properties["parcel_label"] = properties.get("parcel_label") or parcel_label(properties.get("par_pin"))
    if properties.get("propertyowner") is not None:
        properties["propertyowner"] = str(properties.get("propertyowner") or "").strip() or None
    apply_pli_hazard(properties, pli_by_pin)
    apply_tolemi_vacant_lot_score(properties, tolemi_by_pin)
    apply_centroid(properties, feature.get("geometry") if isinstance(feature.get("geometry"), dict) else None)

    return {
        "type": "Feature",
        "geometry": feature.get("geometry"),
        "properties": {field: properties.get(field) for field in PUBLIC_FIELDS},
    }


def source_paths() -> list[Path]:
    sources = [path for path in [BROAD_SOURCE, RESIDENTIAL_SOURCE] if path.exists()]
    if sources:
        return sources
    if EXISTING_PUBLIC_SOURCE.exists():
        return [EXISTING_PUBLIC_SOURCE]
    raise FileNotFoundError(
        "No vacant-land GeoJSON sources found. Expected exports/vacant_land_broad.geojson "
        "and/or docs/data/vacant_land_residential_triage.geojson."
    )


def main() -> None:
    pli_by_pin = load_pli_hazard_by_pin()
    print(f"Loaded {len(pli_by_pin):,} WPRDC PINs with PLI hazard scores 1-4")
    tolemi_by_pin = load_tolemi_vacant_lot_scores()
    print(f"Loaded {len(tolemi_by_pin):,} Tolemi PINs with vacant-lot scores")

    features_by_pin: dict[str, dict[str, object]] = {}
    excluded_count = 0

    for source in source_paths():
        print(f"Reading {source}")
        for feature in load_features(source):
            sanitized = sanitize_feature(feature, pli_by_pin, tolemi_by_pin)
            if not include_dashboard_feature(sanitized["properties"]):
                excluded_count += 1
                continue
            pin = normalize_pin(sanitized["properties"].get("par_pin"))
            if not pin:
                continue
            sanitized["properties"]["par_pin"] = pin
            features_by_pin.setdefault(pin, sanitized)

    features = list(features_by_pin.values())
    features.sort(key=lambda item: str(item["properties"].get("par_pin") or ""))

    pli_counts = Counter(
        str(item["properties"].get("pli_hazard_band") or "Not scored") for item in features
    )
    pli_matched = sum(count for band, count in pli_counts.items() if band != "Not scored")
    print(f"PLI hazard matches in public bundle: {pli_matched:,}")
    for band in ["Score 4", "Score 3", "Score 2", "Score 1", "Not scored"]:
        print(f"  {band}: {pli_counts.get(band, 0):,}")

    lot_counts = Counter(
        str(item["properties"].get("vacant_lot_score_band") or "Not scored") for item in features
    )
    lot_matched = sum(count for band, count in lot_counts.items() if band != "Not scored")
    print(f"Tolemi vacant-lot score matches in public bundle: {lot_matched:,}")
    for band in [
        "High (75-100)",
        "Medium (50-74)",
        "Low (25-49)",
        "Very low (0-24)",
        "Not scored",
    ]:
        print(f"  {band}: {lot_counts.get(band, 0):,}")

    collection = {
        "type": "FeatureCollection",
        "features": features,
    }

    text = json.dumps(collection, separators=(",", ":"), ensure_ascii=False)
    for output in OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(text, encoding="utf-8")
        print(f"Wrote {output} with {len(features):,} features")
    print(f"Excluded {excluded_count:,} infrastructure/ROW features from dashboard parcel bundle")


if __name__ == "__main__":
    main()
