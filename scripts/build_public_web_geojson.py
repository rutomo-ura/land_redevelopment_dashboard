r"""Build the public web-app GeoJSON with property-use groups.

The internal staff bundle keeps parcel identifiers, screening fields, and owner
names for spreadsheet review. It combines the already reviewed residential
public layer with the broader vacant-land export so commercial, industrial,
public/institutional, and other parcels can be filtered in the app.

PLI hazard bands are joined from the public WPRDC Condemned and Dead-End
Properties dataset (latest_inspection_score) on Allegheny parcel PIN.

Tolemi tax-sale vacant-lot scores are joined from the BuildingBlocks export
(tax_sale_vacant_lot_score) for denser vacant-land prioritization coloring.

EPP parcel attributes (including project_name and vacant class) are joined from
gis.epp_parcels_full via local PostgreSQL when configured, with a published
FeatureServer fallback for spreadsheet/table export and vacant filtering.
"""

from __future__ import annotations

import csv
import json
import os
import urllib.parse
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
POSTGRES_TAX_3YR_CSV = REPO_ROOT / "exports" / "live_postgres_tax_delinquency_3yr.csv"
EPP_ATTR_CACHE = REPO_ROOT / "exports" / "epp_parcel_attributes.csv"
EPP_FEATURE_SERVICE_URL = (
    "https://services1.arcgis.com/0DMNBNaacQNEfN4H/arcgis/rest/services/"
    "gisdb_gis_epp_parcels_full/FeatureServer/0/query"
)
OUTPUTS = [
    REPO_ROOT / "docs" / "data" / "vacant_land_triage.geojson",
    REPO_ROOT / "webmap" / "data" / "vacant_land_triage.geojson",
]

EPP_SOURCE_FIELDS = [
    "par_pin",
    "par_mapblocklo",
    "parcel_number",
    "property_id",
    "project_name",
    "inventory_type",
    "current_status",
    "property_class",
    "neighborhood",
    "council_district",
    "census_tract",
    "parcel_sqft",
    "zoned_as",
    "tags",
    "property_maint_mgr_name",
    "published",
    "mod_dt",
]

PUBLIC_FIELDS = [
    "par_pin",
    "parcel_label",
    "propertyowner",
    "project_name",
    "vacant_flag",
    "is_vacant",
    "epp_inventory_type",
    "epp_current_status",
    "epp_property_class",
    "epp_neighborhood",
    "epp_council_district",
    "epp_census_tract",
    "epp_parcel_number",
    "epp_mapblocklot",
    "epp_parcel_sqft",
    "epp_zoned_as",
    "epp_tags",
    "epp_property_maint_mgr_name",
    "epp_published",
    "epp_mod_dt",
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
    "tax_delinquent_3yr",
    "tax_prior_years_canonical",
    "tax_owed_band",
    "tax_source",
    "tax_address",
    "tax_ward",
    "tolemi_address",
    "tolemi_tax_status",
    "tolemi_property_type",
    "tolemi_usps_vacant",
    "tolemi_open_code_violations",
    "tolemi_condemnation",
    "tolemi_structure_score",
    "pli_latest_inspection_result",
    "pli_inspection_status",
    "pli_record_number",
    "pli_create_date",
    "pli_ward",
    "source_coverage",
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


def parse_integer(raw: object) -> int | None:
    number = parse_tolemi_score(raw)
    return None if number is None else int(number)


def tax_owed_band(raw: object) -> str:
    amount = parse_tolemi_score(raw)
    if amount is None:
        return "Not in 3+ year extract"
    if amount < 1_000:
        return "Under $1k"
    if amount < 5_000:
        return "$1k-$5k"
    if amount < 10_000:
        return "$5k-$10k"
    if amount < 25_000:
        return "$10k-$25k"
    if amount < 50_000:
        return "$25k-$50k"
    return "$50k+"


def ensure_wprdc_condemned_csv(path: Path = WPRDC_CONDEMNED_CACHE) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 0:
        return path
    print(f"Downloading WPRDC condemned properties CSV to {path}")
    with urllib.request.urlopen(WPRDC_CONDEMNED_URL, timeout=120) as response:
        path.write_bytes(response.read())
    return path


def load_pli_hazard_by_pin(path: Path | None = None) -> dict[str, dict[str, object]]:
    csv_path = ensure_wprdc_condemned_csv(path or WPRDC_CONDEMNED_CACHE)
    best: dict[str, dict[str, object]] = {}
    with csv_path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            pin = normalize_pin(row.get("parcel_id"))
            score = normalize_pli_score(row.get("latest_inspection_score"))
            if not pin:
                continue
            previous = best.get(pin)
            previous_score = previous.get("score") if previous else None
            if previous is None or (score or -1) > (previous_score or -1):
                best[pin] = {
                    "score": score,
                    "latest_inspection_result": _clean_text(row.get("latest_inspection_result")),
                    "inspection_status": _clean_text(row.get("inspection_status")),
                    "record_number": _clean_text(row.get("record_number")),
                    "create_date": _clean_text(row.get("create_date")),
                    "ward": _clean_text(row.get("ward")),
                }
    return best


def load_tolemi_vacant_lot_scores(path: Path = TOLEMI_TAX_STATUS_CSV) -> dict[str, dict[str, object]]:
    if not path.exists():
        print(f"Tolemi export not found at {path}; Tolemi fields will be blank")
        return {}

    best: dict[str, dict[str, object]] = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            pin = normalize_tolemi_pin(row.get("parcel_id"))
            if not pin:
                continue
            best[pin] = {
                "address": _clean_text(row.get("address") or row.get("street_address")),
                "tax_status": _clean_text(row.get("tax_delinquency_status")),
                "property_type": _clean_text(row.get("property_type")),
                "usps_vacant": _clean_text(row.get("usps_is_flagged_vacant")),
                "open_code_violations": _clean_text(row.get("code_violations_open")),
                "condemnation": _clean_text(row.get("condemnation_yes_no") or row.get("condemnations_by_type")),
                "structure_score": parse_tolemi_score(row.get("tax_sale_structure_score")),
                "vacant_lot_score": parse_tolemi_score(row.get("tax_sale_vacant_lot_score")),
            }
    return best


def load_postgres_tax_3yr(path: Path = POSTGRES_TAX_3YR_CSV) -> dict[str, dict[str, object]]:
    if not path.exists():
        print(f"PostgreSQL 3+ year tax export not found at {path}; canonical tax fields will be blank")
        return {}
    by_pin: dict[str, dict[str, object]] = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            pin = normalize_pin(row.get("pin"))
            if not pin:
                continue
            by_pin[pin] = {
                "prior_years": parse_integer(row.get("prior_years")),
                "owed_band": tax_owed_band(row.get("total_owed")),
                "address": _clean_text(row.get("address")),
                "ward": _clean_text(row.get("ward")),
            }
    return by_pin


def _clean_text(value: object) -> str | None:
    text = str(value or "").strip()
    if not text or text.lower() in {"none", "null", "nan"}:
        return None
    return text


def load_dotenv(path: Path = REPO_ROOT / ".env") -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key and key not in os.environ:
            os.environ[key] = value


def vacant_flag_from_epp(attrs: dict[str, object]) -> str:
    property_class = str(attrs.get("property_class") or "").strip().lower()
    inventory_type = str(attrs.get("inventory_type") or "").strip().lower()
    current_status = str(attrs.get("current_status") or "").strip().lower()
    tags = str(attrs.get("tags") or "").strip().lower()
    if "vacant land" in property_class:
        return "Vacant land"
    if "vacant structure" in property_class:
        return "Vacant structure"
    if "vacant" in property_class or "vacant" in inventory_type or "vacant" in current_status or "vacant" in tags:
        return "Vacant (other)"
    if any(attrs.get(field) for field in ("property_class", "inventory_type", "current_status", "project_name")):
        return "Not vacant"
    return "Not in EPP"


def _serialize_epp_value(value: object) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat(sep=" ", timespec="seconds")
        except TypeError:
            return value.isoformat()
    text = _clean_text(value)
    return text


def write_epp_cache(by_pin: dict[str, dict[str, object]], cache_path: Path) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with cache_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=EPP_SOURCE_FIELDS)
        writer.writeheader()
        for pin in sorted(by_pin):
            row = {"par_pin": pin}
            row.update({field: by_pin[pin].get(field) for field in EPP_SOURCE_FIELDS if field != "par_pin"})
            writer.writerow(row)


def fetch_epp_attributes_from_postgres() -> dict[str, dict[str, object]]:
    load_dotenv()
    host = os.environ.get("PGHOST")
    database = os.environ.get("PGDATABASE")
    user = os.environ.get("PGUSER")
    password = os.environ.get("PGPASSWORD")
    port = int(os.environ.get("PGPORT") or "5432")
    if not host or not database or not user or not password:
        raise RuntimeError("Postgres env not configured (PGHOST/PGDATABASE/PGUSER/PGPASSWORD)")

    try:
        import psycopg2
        import psycopg2.extras
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("psycopg2 is required for Postgres EPP joins") from exc

    columns = ", ".join(EPP_SOURCE_FIELDS)
    query = f"""
        SELECT {columns}
        FROM gis.epp_parcels_full
        WHERE par_pin IS NOT NULL
    """
    by_pin: dict[str, dict[str, object]] = {}
    with psycopg2.connect(
        host=host,
        port=port,
        dbname=database,
        user=user,
        password=password,
    ) as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query)
            for row in cur:
                pin = normalize_pin(row.get("par_pin"))
                if not pin:
                    continue
                attrs = {
                    field: _serialize_epp_value(row.get(field))
                    for field in EPP_SOURCE_FIELDS
                    if field != "par_pin"
                }
                attrs["par_pin"] = pin
                by_pin.setdefault(pin, attrs)
    return by_pin


def fetch_epp_attributes_from_featureserver(cache_path: Path = EPP_ATTR_CACHE) -> dict[str, dict[str, object]]:
    """Page the published EPP FeatureServer mirror when Postgres is unavailable."""
    by_pin: dict[str, dict[str, object]] = {}
    offset = 0
    page_size = 2000
    out_fields = ",".join(EPP_SOURCE_FIELDS)

    while True:
        params = {
            "f": "json",
            "where": "1=1",
            "returnGeometry": "false",
            "outFields": out_fields,
            "resultOffset": str(offset),
            "resultRecordCount": str(page_size),
            "orderByFields": "OBJECTID",
        }
        url = f"{EPP_FEATURE_SERVICE_URL}?{urllib.parse.urlencode(params)}"
        with urllib.request.urlopen(url, timeout=120) as response:
            payload = json.loads(response.read().decode("utf-8"))
        if "error" in payload:
            raise RuntimeError(payload["error"])

        features = payload.get("features") or []
        if not features:
            break

        for feature in features:
            attrs_raw = feature.get("attributes") or {}
            pin = normalize_pin(attrs_raw.get("par_pin"))
            if not pin:
                continue
            attrs = {
                field: _serialize_epp_value(attrs_raw.get(field))
                for field in EPP_SOURCE_FIELDS
                if field != "par_pin"
            }
            attrs["par_pin"] = pin
            by_pin.setdefault(pin, attrs)

        if not payload.get("exceededTransferLimit"):
            break
        offset += page_size

    write_epp_cache(by_pin, cache_path)
    return by_pin


def load_epp_attributes_from_cache(path: Path = EPP_ATTR_CACHE) -> dict[str, dict[str, object]]:
    if not path.exists():
        return {}
    by_pin: dict[str, dict[str, object]] = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            pin = normalize_pin(row.get("par_pin") or row.get("parcel_id"))
            if not pin:
                continue
            attrs = {
                field: _clean_text(row.get(field))
                for field in EPP_SOURCE_FIELDS
                if field != "par_pin"
            }
            attrs["par_pin"] = pin
            by_pin.setdefault(pin, attrs)
    return by_pin


def load_epp_attributes(
    path: Path = EPP_ATTR_CACHE,
    *,
    refresh: bool = False,
) -> dict[str, dict[str, object]]:
    if path.exists() and not refresh:
        cached = load_epp_attributes_from_cache(path)
        if cached:
            return cached

    try:
        by_pin = fetch_epp_attributes_from_postgres()
        write_epp_cache(by_pin, path)
        print(f"Loaded EPP attributes from Postgres ({len(by_pin):,} PINs)")
        return by_pin
    except Exception as pg_exc:  # noqa: BLE001
        if os.environ.get("REQUIRE_POSTGRES_EPP") == "1":
            raise RuntimeError(f"Required Postgres EPP refresh failed: {pg_exc}") from pg_exc
        print(f"Postgres EPP load failed ({pg_exc}); trying FeatureServer fallback")

    try:
        by_pin = fetch_epp_attributes_from_featureserver(path)
        print(f"Loaded EPP attributes from FeatureServer ({len(by_pin):,} PINs)")
        return by_pin
    except Exception as fs_exc:  # noqa: BLE001
        print(f"EPP attribute fetch failed ({fs_exc}); EPP fields will be blank")
        return {}


def load_features(path: Path) -> list[dict[str, object]]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    return data.get("features", [])


def apply_pli_hazard(properties: dict[str, object], pli_by_pin: dict[str, dict[str, object]]) -> None:
    pin = normalize_pin(properties.get("par_pin"))
    attrs = pli_by_pin.get(pin) or {}
    score = attrs.get("score")
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
    properties["pli_latest_inspection_result"] = attrs.get("latest_inspection_result")
    properties["pli_inspection_status"] = attrs.get("inspection_status")
    properties["pli_record_number"] = attrs.get("record_number")
    properties["pli_create_date"] = attrs.get("create_date")
    properties["pli_ward"] = attrs.get("ward")


def apply_tolemi_vacant_lot_score(
    properties: dict[str, object],
    tolemi_by_pin: dict[str, dict[str, object]],
) -> None:
    pin = normalize_pin(properties.get("par_pin"))
    attrs = tolemi_by_pin.get(pin) or {}
    score = attrs.get("vacant_lot_score") if attrs else parse_tolemi_score(
        properties.get("tax_sale_vacant_lot_score")
    )
    properties["tax_sale_vacant_lot_score"] = None if score is None else round(score, 2)
    properties["vacant_lot_score_band"] = vacant_lot_score_band(score)
    if attrs:
        properties["tolemi_address"] = attrs.get("address")
        properties["tolemi_tax_status"] = attrs.get("tax_status")
        properties["tolemi_property_type"] = attrs.get("property_type")
        properties["tolemi_usps_vacant"] = attrs.get("usps_vacant")
        properties["tolemi_open_code_violations"] = attrs.get("open_code_violations")
        properties["tolemi_condemnation"] = attrs.get("condemnation")
        properties["tolemi_structure_score"] = attrs.get("structure_score")


def apply_postgres_tax_3yr(
    properties: dict[str, object],
    postgres_tax_by_pin: dict[str, dict[str, object]],
) -> None:
    pin = normalize_pin(properties.get("par_pin"))
    attrs = postgres_tax_by_pin.get(pin) or {}
    if not postgres_tax_by_pin:
        properties.setdefault("tax_delinquent_3yr", "No")
        properties.setdefault("tax_owed_band", "Not in 3+ year extract")
        return
    matched = bool(attrs)
    properties["tax_delinquent_3yr"] = "Yes" if matched else "No"
    properties["tax_prior_years_canonical"] = attrs.get("prior_years")
    properties["tax_owed_band"] = attrs.get("owed_band") or "Not in 3+ year extract"
    properties["tax_source"] = "PostgreSQL gis.city_tax_delinquent_3yr" if matched else None
    properties["tax_address"] = attrs.get("address")
    properties["tax_ward"] = attrs.get("ward")


def apply_epp_attributes(
    properties: dict[str, object],
    epp_by_pin: dict[str, dict[str, object]],
) -> None:
    pin = normalize_pin(properties.get("par_pin"))
    attrs = epp_by_pin.get(pin) or {}
    properties["project_name"] = attrs.get("project_name")
    properties["epp_inventory_type"] = attrs.get("inventory_type")
    properties["epp_current_status"] = attrs.get("current_status")
    properties["epp_property_class"] = attrs.get("property_class")
    properties["epp_neighborhood"] = attrs.get("neighborhood")
    properties["epp_council_district"] = attrs.get("council_district")
    properties["epp_census_tract"] = attrs.get("census_tract")
    properties["epp_parcel_number"] = attrs.get("parcel_number")
    properties["epp_mapblocklot"] = attrs.get("par_mapblocklo")
    properties["epp_parcel_sqft"] = attrs.get("parcel_sqft")
    properties["epp_zoned_as"] = attrs.get("zoned_as")
    properties["epp_tags"] = attrs.get("tags")
    properties["epp_property_maint_mgr_name"] = attrs.get("property_maint_mgr_name")
    properties["epp_published"] = attrs.get("published")
    properties["epp_mod_dt"] = attrs.get("mod_dt")
    vacant_flag = vacant_flag_from_epp(attrs)
    properties["vacant_flag"] = vacant_flag
    properties["is_vacant"] = vacant_flag.startswith("Vacant")


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
    pli_by_pin: dict[str, dict[str, object]],
    tolemi_by_pin: dict[str, dict[str, object]],
    postgres_tax_by_pin: dict[str, dict[str, object]],
    epp_by_pin: dict[str, dict[str, object]],
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
    apply_postgres_tax_3yr(properties, postgres_tax_by_pin)
    apply_epp_attributes(properties, epp_by_pin)
    coverage = ["Vacant land"]
    pin = normalize_pin(properties.get("par_pin"))
    if pin in postgres_tax_by_pin:
        coverage.append("PostgreSQL tax")
    if pin in tolemi_by_pin:
        coverage.append("Tolemi")
    if pin in pli_by_pin:
        coverage.append("PLI")
    if pin in epp_by_pin:
        coverage.append("EPP")
    properties["source_coverage"] = " | ".join(coverage)
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
    print(f"Loaded {len(pli_by_pin):,} WPRDC PLI parcel records")
    tolemi_by_pin = load_tolemi_vacant_lot_scores()
    print(f"Loaded {len(tolemi_by_pin):,} Tolemi parcel records")
    postgres_tax_by_pin = load_postgres_tax_3yr()
    print(f"Loaded {len(postgres_tax_by_pin):,} PostgreSQL 3+ year tax records")
    epp_by_pin = load_epp_attributes(refresh=True)
    print(f"Loaded {len(epp_by_pin):,} EPP PINs with parcel attributes")

    features_by_pin: dict[str, dict[str, object]] = {}
    existing_by_pin: dict[str, dict[str, object]] = {}
    if EXISTING_PUBLIC_SOURCE.exists():
        existing_by_pin = {
            normalize_pin((feature.get("properties") or {}).get("par_pin")): feature
            for feature in load_features(EXISTING_PUBLIC_SOURCE)
            if normalize_pin((feature.get("properties") or {}).get("par_pin"))
        }
    excluded_count = 0

    for source in source_paths():
        print(f"Reading {source}")
        for feature in load_features(source):
            source_properties = dict(feature.get("properties") or {})
            source_pin = normalize_pin(source_properties.get("par_pin"))
            existing = existing_by_pin.get(source_pin) or {}
            if existing:
                merged_properties = dict(existing.get("properties") or {})
                merged_properties.update(source_properties)
                feature = {
                    **feature,
                    "geometry": feature.get("geometry") or existing.get("geometry"),
                    "properties": merged_properties,
                }
            sanitized = sanitize_feature(
                feature,
                pli_by_pin,
                tolemi_by_pin,
                postgres_tax_by_pin,
                epp_by_pin,
            )
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

    project_matched = sum(1 for item in features if item["properties"].get("project_name"))
    vacant_counts = Counter(str(item["properties"].get("vacant_flag") or "Not in EPP") for item in features)
    print(f"EPP project_name matches in public bundle: {project_matched:,}")
    print("Vacant flag coverage:")
    for label in ["Vacant land", "Vacant structure", "Vacant (other)", "Not vacant", "Not in EPP"]:
        print(f"  {label}: {vacant_counts.get(label, 0):,}")

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
