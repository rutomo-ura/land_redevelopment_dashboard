r"""Spatially enrich public parcel GeoJSON with City boundaries.

Downloads authoritative City of Pittsburgh neighborhood and 2022 Council
district boundaries from WPRDC, assigns each public parcel by geometry centroid,
and writes updated public GeoJSON plus chart-ready summary JSON.
"""

from __future__ import annotations

import json
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path
from statistics import median


REPO_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_GEOJSON_PATHS = [
    REPO_ROOT / "docs" / "data" / "vacant_land_triage.geojson",
    REPO_ROOT / "webmap" / "data" / "vacant_land_triage.geojson",
]
SUMMARY_OUTPUTS = [
    REPO_ROOT / "docs" / "data" / "boundary_analysis.json",
    REPO_ROOT / "webmap" / "data" / "boundary_analysis.json",
]
OWNERSHIP_OUTPUTS = [
    REPO_ROOT / "docs" / "data" / "ownership_analysis.json",
    REPO_ROOT / "webmap" / "data" / "ownership_analysis.json",
]

NEIGHBORHOOD_GEOJSON_URL = (
    "https://data.wprdc.org/dataset/e672f13d-71c4-4a66-8f38-710e75ed80a4/"
    "resource/4af8e160-57e9-4ebf-a501-76ca1b42fc99/download/neighborhoods.geojson"
)
COUNCIL_GEOJSON_URL = (
    "https://data.wprdc.org/dataset/8249c8b6-37c6-4849-abe7-c9abbcdf6197/"
    "resource/eb8d8237-16d5-4b19-ab71-ed89343aa448/download/council_districts_2022.geojson"
)

NEIGHBORHOOD_SERVICE_URL = (
    "https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/"
    "PGHWebNeighborhoods/FeatureServer/0"
)
COUNCIL_SERVICE_URL = (
    "https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/"
    "CouncilDistricts2022/FeatureServer/0"
)


def load_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def fetch_geojson(url: str) -> dict[str, object]:
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.loads(response.read().decode("utf-8-sig"))


def iter_points(geometry: dict[str, object]) -> list[tuple[float, float]]:
    coords = geometry.get("coordinates") or []
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

    if geom_type in {"Polygon", "MultiPolygon"}:
        collect(coords)

    return points


def centroid(geometry: dict[str, object]) -> tuple[float, float] | None:
    points = iter_points(geometry)
    if not points:
        return None
    return (
        sum(point[0] for point in points) / len(points),
        sum(point[1] for point in points) / len(points),
    )


def rings_for_geometry(geometry: dict[str, object]) -> list[list[list[float]]]:
    geom_type = geometry.get("type")
    coords = geometry.get("coordinates") or []
    if geom_type == "Polygon":
        return coords
    if geom_type == "MultiPolygon":
        return [ring for polygon in coords for ring in polygon]
    return []


def point_in_ring(point: tuple[float, float], ring: list[list[float]]) -> bool:
    x, y = point
    inside = False
    j = len(ring) - 1

    for i, vertex in enumerate(ring):
        xi, yi = float(vertex[0]), float(vertex[1])
        xj, yj = float(ring[j][0]), float(ring[j][1])
        intersects = (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi
        if intersects:
            inside = not inside
        j = i

    return inside


def contains_point(geometry: dict[str, object], point: tuple[float, float]) -> bool:
    geom_type = geometry.get("type")
    polygons = [geometry.get("coordinates") or []]
    if geom_type == "MultiPolygon":
        polygons = geometry.get("coordinates") or []
    if geom_type not in {"Polygon", "MultiPolygon"}:
        return False

    for polygon in polygons:
        if not polygon:
            continue
        outer = polygon[0]
        holes = polygon[1:]
        if point_in_ring(point, outer) and not any(point_in_ring(point, hole) for hole in holes):
            return True
    return False


def bbox(geometry: dict[str, object]) -> tuple[float, float, float, float]:
    points = iter_points(geometry)
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return (min(xs), min(ys), max(xs), max(ys))


def boundary_records(
    collection: dict[str, object],
    name_field: str,
    value_field: str | None = None,
) -> list[dict[str, object]]:
    records = []
    for feature in collection.get("features", []):
        geometry = feature.get("geometry") or {}
        properties = feature.get("properties") or {}
        label = properties.get(name_field)
        value = properties.get(value_field) if value_field else label
        if not label or not value:
            continue
        records.append(
            {
                "label": str(label),
                "value": str(value),
                "geometry": geometry,
                "bbox": bbox(geometry),
            }
        )
    return records


def find_boundary(
    point: tuple[float, float],
    records: list[dict[str, object]],
) -> dict[str, object] | None:
    x, y = point
    for record in records:
        min_x, min_y, max_x, max_y = record["bbox"]
        if min_x <= x <= max_x and min_y <= y <= max_y and contains_point(record["geometry"], point):
            return record
    return None


def summarize(features: list[dict[str, object]], field: str, limit: int = 10) -> list[dict[str, object]]:
    grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
    for feature in features:
        properties = feature.get("properties") or {}
        value = properties.get(field)
        if value:
            grouped[str(value)].append(properties)

    rows = []
    for label, properties_list in grouped.items():
        prior_values = [int(item.get("prior_years") or 0) for item in properties_list]
        rows.append(
            {
                "label": label,
                "value": len(properties_list),
                "priorYearsMedian": round(float(median(prior_values)), 1) if prior_values else 0,
                "commercialParcels": sum(1 for item in properties_list if item.get("use_group") == "Commercial"),
                "publicInstitutionalParcels": sum(
                    1 for item in properties_list if item.get("use_group") == "Public / institutional"
                ),
            }
        )

    rows.sort(key=lambda item: (-item["value"], item["label"]))
    return rows[:limit]


def ownership_summary(features: list[dict[str, object]]) -> dict[str, object]:
    groups: dict[str, list[dict[str, object]]] = defaultdict(list)
    control_paths: dict[str, list[dict[str, object]]] = defaultdict(list)
    for feature in features:
        properties = feature.get("properties") or {}
        group = str(properties.get("ownership_group") or "Private / Other")
        groups[group].append(properties)
        control_path = str(properties.get("control_path") or "Private or monitor")
        control_paths[control_path].append(properties)

    order = [
        "City Owned",
        "URA Owned",
        "PLB Owned",
        "HACP Owned",
        "Other Public / Institutional",
        "Private / Other",
    ]

    rows = []
    for group in order:
        properties_list = groups.get(group, [])
        acres = sum(float(item.get("par_calcacreag") or 0) for item in properties_list)
        rows.append(
            {
                "label": group,
                "value": len(properties_list),
                "acres": round(acres, 2),
                "longPriorParcels": sum(int(item.get("prior_years") or 0) >= 11 for item in properties_list),
                "threePlusPriorParcels": sum(int(item.get("prior_years") or 0) >= 3 for item in properties_list),
            }
        )

    public_controlled = sum(
        item["value"]
        for item in rows
        if item["label"] in {"City Owned", "URA Owned", "PLB Owned", "HACP Owned"}
    )
    public_or_institutional = sum(
        item["value"]
        for item in rows
        if item["label"] != "Private / Other"
    )
    private_review = next(
        (item["threePlusPriorParcels"] for item in rows if item["label"] == "Private / Other"),
        0,
    )

    return {
        "groups": rows,
        "controlPaths": [
            {"label": label, "value": len(control_paths.get(label, []))}
            for label in [
                "Existing public control",
                "Public or institutional review",
                "Private acquisition review",
                "Private or monitor",
            ]
        ],
        "kpis": {
            "publicControlledParcels": public_controlled,
            "publicOrInstitutionalParcels": public_or_institutional,
            "privateThreePlusPriorParcels": private_review,
        },
        "topPublicNeighborhoods": summarize(
            [
                {"properties": item}
                for feature in features
                for item in [feature.get("properties") or {}]
                if item.get("ownership_group") != "Private / Other"
            ],
            "city_neighborhood",
            8,
        ),
    }


def main() -> None:
    parcels = load_json(PUBLIC_GEOJSON_PATHS[0])
    features = parcels.get("features", [])
    neighborhoods = boundary_records(fetch_geojson(NEIGHBORHOOD_GEOJSON_URL), "hood")
    council_districts = boundary_records(fetch_geojson(COUNCIL_GEOJSON_URL), "DIST_NAME", "DIST_ID")

    assignment_counts = Counter()

    for feature in features:
        properties = feature.setdefault("properties", {})
        point = centroid(feature.get("geometry") or {})
        if not point:
            properties["city_neighborhood"] = None
            properties["council_district"] = None
            properties["council_district_label"] = None
            assignment_counts["missing_geometry"] += 1
            continue

        neighborhood = find_boundary(point, neighborhoods)
        council = find_boundary(point, council_districts)

        properties["city_neighborhood"] = neighborhood["label"] if neighborhood else None
        properties["council_district"] = council["value"] if council else None
        properties["council_district_label"] = council["label"] if council else None

        assignment_counts["neighborhood_assigned" if neighborhood else "neighborhood_unassigned"] += 1
        assignment_counts["council_assigned" if council else "council_unassigned"] += 1

    summary = {
        "sources": {
            "neighborhoods": {
                "name": "City of Pittsburgh Neighborhoods",
                "geojsonUrl": NEIGHBORHOOD_GEOJSON_URL,
                "serviceUrl": NEIGHBORHOOD_SERVICE_URL,
                "nameField": "hood",
            },
            "councilDistricts": {
                "name": "City of Pittsburgh Council Districts 2022",
                "geojsonUrl": COUNCIL_GEOJSON_URL,
                "serviceUrl": COUNCIL_SERVICE_URL,
                "idField": "DIST_ID",
                "nameField": "DIST_NAME",
            },
        },
        "assignmentCounts": dict(sorted(assignment_counts.items())),
        "neighborhoods": summarize(features, "city_neighborhood", 12),
        "councilDistricts": summarize(features, "council_district_label", 9),
    }
    ownership = ownership_summary(features)

    parcel_text = json.dumps(parcels, ensure_ascii=False, separators=(",", ":"))
    summary_text = json.dumps(summary, ensure_ascii=False, indent=2)
    ownership_text = json.dumps(ownership, ensure_ascii=False, indent=2)

    for path in PUBLIC_GEOJSON_PATHS:
        path.write_text(parcel_text, encoding="utf-8")
        print(f"Wrote {path}")

    for path in SUMMARY_OUTPUTS:
        path.write_text(summary_text, encoding="utf-8")
        print(f"Wrote {path}")

    for path in OWNERSHIP_OUTPUTS:
        path.write_text(ownership_text, encoding="utf-8")
        print(f"Wrote {path}")

    print(json.dumps(summary["assignmentCounts"], indent=2))


if __name__ == "__main__":
    main()
