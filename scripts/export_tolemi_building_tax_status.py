"""Export the public BuildingBlocks tax-delinquency screening dataset."""

from __future__ import annotations

import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ENDPOINT = "https://cg.tolemi.com/q"
HEADERS = {"content-type": "application/json", "apollo-require-preflight": "true", "city-alias": "pittsburgh-pa", "product": "buildingBlocks", "accept-language": "en"}
RECORD_QUERY = "query fetchAssetRecords($params: JSON, $savedViewId: ID) { assetRecords(params: $params, savedViewId: $savedViewId) }"
COUNT_QUERY = "query fetchAssetCount($filters: JSON, $includeBounds: Boolean) { assetCount(filters: $filters, includeBounds: $includeBounds) }"
ATTRIBUTES = ["address", "street_address", "city", "state", "zip", "pid", "identity_owner", "filter3451", "filter1953", "filter2978", "filter192_value", "filter662", "filter2615_value", "filter2647_value", "filter550", "filter3299", "attribute4849", "score729705", "score729706"]
COLUMNS = [
    ("asset_id", "id"), ("parcel_id", "pid"), ("address", "_address"), ("street_address", "street_address"),
    ("city", "city"), ("state", "state"), ("zip", "zip"), ("owner", "identity_owner"),
    ("tax_delinquency_status", "filter3451"), ("property_type", "filter1953"),
    ("usps_is_flagged_vacant", "filter2978"), ("demolitions", "filter192_value"),
    ("code_violations_open", "filter662"), ("condemnations_by_type", "filter2615_value"),
    ("condemnation_yes_no", "filter2647_value"), ("tax_years_delinquent_city", "filter550"),
    ("total_taxes_plus_interest_penalties", "filter3299"), ("prior_years_delinquent_taxes", "attribute4849"),
    ("tax_sale_structure_score", "score729705"), ("tax_sale_vacant_lot_score", "score729706"),
]


def post_graphql(body: dict) -> dict:
    request = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(), headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read(500).decode(errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
    if payload.get("errors") or payload.get("error"):
        raise RuntimeError(json.dumps(payload.get("errors") or payload.get("error"))[:1000])
    return payload["data"]


def parse_address(value: object) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        return str(value)
    try:
        parsed = json.loads(value)
        return parsed.get("address") or parsed.get("commonName") or value
    except (json.JSONDecodeError, AttributeError):
        return value


def fetch_page(page: int) -> tuple[int, list[dict]]:
    body = {"operationName": "fetchAssetRecords", "query": RECORD_QUERY, "variables": {"params": {
        "heatAttribute": "filter3451", "filter3451": "Yes", "attributes": ATTRIBUTES,
        "sort": None, "order": "asc", "page": page, "list": True,
    }}}
    for attempt in range(1, 6):
        try:
            return page, post_graphql(body).get("assetRecords") or []
        except Exception:
            if attempt == 5:
                raise
            time.sleep(0.6 * attempt)
    return page, []


def increment(bucket: dict, value: object) -> None:
    key = "(blank)" if value is None or value == "" else str(value)
    bucket[key] = bucket.get(key, 0) + 1


def main() -> None:
    out_dir = Path("exports").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_csv = out_dir / "tolemi_building_tax_delinquency_status.csv"
    out_stats = out_dir / "tolemi_building_tax_delinquency_status.stats.json"
    count = post_graphql({"operationName": "fetchAssetCount", "query": COUNT_QUERY, "variables": {
        "filters": {"heatAttribute": "filter3451", "filter3451": "Yes"}, "includeBounds": False,
    }})
    total = int(count["assetCount"]["assetCount"])
    page_count = (total + 99) // 100
    concurrency = max(1, int(os.environ.get("TOLEMI_EXPORT_CONCURRENCY", "30")))
    started = time.monotonic()
    pages: dict[int, list[dict]] = {}
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(fetch_page, page) for page in range(page_count)]
        for completed, future in enumerate(as_completed(futures), 1):
            page, rows = future.result()
            pages[page] = rows
            if completed % 50 == 0 or completed == page_count:
                print(f"pages {completed}/{page_count}, {round(time.monotonic() - started)}s", file=sys.stderr)

    stats = {
        "exported_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": "https://pittsburgh-pa.tolemi.com public BuildingBlocks list, heatAttribute filter3451, filter3451 Yes",
        "total_expected": total, "pages_expected": page_count, "raw_rows_seen": 0,
        "duplicate_asset_ids_skipped": 0, "rows_exported": 0, "property_type": {},
        "tax_years_delinquent_city": {}, "usps_is_flagged_vacant": {},
        "non_null_counts": {label: 0 for label, _ in COLUMNS},
    }
    seen: set[str] = set()
    with out_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\r\n")
        writer.writerow(label for label, _ in COLUMNS)
        for page in range(page_count):
            for row in pages[page]:
                stats["raw_rows_seen"] += 1
                asset_id = str(row.get("id"))
                if asset_id in seen:
                    stats["duplicate_asset_ids_skipped"] += 1
                    continue
                seen.add(asset_id)
                row["_address"] = parse_address(row.get("address"))
                values = []
                for label, key in COLUMNS:
                    value = row.get(key)
                    if value is not None and str(value) != "":
                        stats["non_null_counts"][label] += 1
                    values.append(value)
                writer.writerow(values)
                stats["rows_exported"] += 1
                increment(stats["property_type"], row.get("filter1953"))
                increment(stats["tax_years_delinquent_city"], row.get("filter550"))
                increment(stats["usps_is_flagged_vacant"], row.get("filter2978"))

    stats["elapsed_seconds"] = round(time.monotonic() - started)
    stats["tax_years_non_blank"] = total - stats["tax_years_delinquent_city"].get("(blank)", 0)
    out_stats.write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"outCsv": str(out_csv), "outStats": str(out_stats), "total": total,
        "rows_exported": stats["rows_exported"], "elapsed_seconds": stats["elapsed_seconds"],
        "property_type": stats["property_type"], "tax_years_non_blank": stats["tax_years_non_blank"]}, indent=2))


if __name__ == "__main__":
    main()
