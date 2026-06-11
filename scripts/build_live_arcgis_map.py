r"""Build the vacant land triage map from a live ArcGIS database connection.

Run this from the ArcGIS Pro Python window or as a script tool, ideally while
the target project is open.

Examples:
    exec(open(r"C:\rutomo-codefolder\vacant-land-triage-map\scripts\build_live_arcgis_map.py").read())

    exec(open(r"C:\rutomo-codefolder\vacant-land-triage-map\scripts\build_live_arcgis_map.py").read(), {
        "SDE_CONNECTION": r"C:\path\to\connection.sde"
    })
"""

from __future__ import annotations

import csv
import json
import os
from pathlib import Path

import arcpy


REPO_ROOT = Path(r"C:\rutomo-codefolder\vacant-land-triage-map")
EXPORT_DIR = REPO_ROOT / "exports"
DATASET_NAME = "gis.calculated_vacant_land"
MAP_NAME = "Vacant Land Triage"
LAYER_NAME = "Vacant Land Parcels"
TEMP_LAYER_NAME = "vacant_land_parcels_live_temp"
BROAD_FOCUS_QUERY = "par_calcacreag >= 0.05"
HIGH_PRIORITY_QUERY = (
    "par_calcacreag >= 0.05 "
    "AND taxdesc = '20 - Taxable' "
    "AND prior_years >= 5"
)


def _message(text: str) -> None:
    print(text)
    try:
        arcpy.AddMessage(text)
    except Exception:
        pass


def _current_project() -> arcpy.mp.ArcGISProject:
    try:
        return arcpy.mp.ArcGISProject("CURRENT")
    except Exception:
        default_aprx = globals().get("APRX_PATH")
        if not default_aprx:
            raise RuntimeError(
                "Open the project in ArcGIS Pro, or set APRX_PATH before running this script."
            )
        return arcpy.mp.ArcGISProject(default_aprx)


def _find_sde_connection(project: arcpy.mp.ArcGISProject) -> str:
    provided = globals().get("SDE_CONNECTION") or os.environ.get("VACANT_LAND_SDE")
    if provided:
        return str(provided)

    candidates: list[str] = []

    for database in getattr(project, "databases", []):
        path = database.get("databasePath") or database.get("connectionString")
        if path and str(path).lower().endswith(".sde"):
            candidates.append(str(path))

    for folder in [Path.home() / "Documents" / "ArcGIS" / "Projects", REPO_ROOT]:
        if folder.exists():
            candidates.extend(str(path) for path in folder.rglob("*.sde"))

    unique = []
    for candidate in candidates:
        if candidate not in unique:
            unique.append(candidate)

    if len(unique) == 1:
        return unique[0]

    if not unique:
        raise RuntimeError(
            "No .sde connection found. Add the PostgreSQL connection in ArcGIS Pro, "
            "or rerun with SDE_CONNECTION set to the .sde path."
        )

    raise RuntimeError(
        "Multiple .sde connections found. Rerun with SDE_CONNECTION set to one of:\n"
        + "\n".join(unique)
    )


def _dataset_path(sde_connection: str) -> str:
    direct = os.path.join(sde_connection, DATASET_NAME)
    if arcpy.Exists(direct):
        return direct

    arcpy.env.workspace = sde_connection
    matches = []
    for feature_class in arcpy.ListFeatureClasses() or []:
        if feature_class.lower().endswith(DATASET_NAME.lower()):
            matches.append(os.path.join(sde_connection, feature_class))

    for dataset in arcpy.ListDatasets(feature_type="feature") or []:
        for feature_class in arcpy.ListFeatureClasses(feature_dataset=dataset) or []:
            qualified = os.path.join(sde_connection, dataset, feature_class)
            if feature_class.lower().endswith(DATASET_NAME.lower()):
                matches.append(qualified)

    if len(matches) == 1:
        return matches[0]

    if not matches:
        raise RuntimeError(f"Could not find {DATASET_NAME} in {sde_connection}")

    raise RuntimeError("Multiple matching feature classes found:\n" + "\n".join(matches))


def _get_or_create_map(project: arcpy.mp.ArcGISProject) -> arcpy.mp.Map:
    maps = project.listMaps(MAP_NAME)
    if maps:
        return maps[0]

    maps = project.listMaps()
    if maps:
        maps[0].name = MAP_NAME
        return maps[0]

    return project.createMap(MAP_NAME, "MAP")


def _remove_layer_by_name(map_obj: arcpy.mp.Map, layer_name: str) -> None:
    for layer in list(map_obj.listLayers()):
        if layer.name == layer_name:
            map_obj.removeLayer(layer)


def _add_live_layer(map_obj: arcpy.mp.Map, dataset: str) -> arcpy.mp.Layer:
    for layer in map_obj.listLayers():
        if layer.name == LAYER_NAME:
            layer.definitionQuery = BROAD_FOCUS_QUERY
            return layer

    def _coerce_added_layer(added_layer):
        if isinstance(added_layer, list):
            return added_layer[0]
        return added_layer

    try:
        added = map_obj.addDataFromPath(dataset)
        layer = _coerce_added_layer(added)
        layer.name = LAYER_NAME
        layer.definitionQuery = BROAD_FOCUS_QUERY
        return layer
    except RuntimeError as exc:
        _message(f"Direct map add failed; trying feature-layer fallback. Detail: {exc}")

    layer_result = arcpy.management.MakeFeatureLayer(
        dataset,
        TEMP_LAYER_NAME,
        where_clause=BROAD_FOCUS_QUERY,
    )
    temp_layer = layer_result.getOutput(0)

    try:
        added_layers = map_obj.addLayer(temp_layer)
        layer = _coerce_added_layer(added_layers)
        layer.name = LAYER_NAME
        layer.definitionQuery = BROAD_FOCUS_QUERY
        return layer
    except RuntimeError as exc:
        _message(f"In-memory feature-layer add failed; trying .lyrx fallback. Detail: {exc}")

    EXPORT_DIR.mkdir(exist_ok=True)
    layer_file = EXPORT_DIR / "vacant_land_parcels_live.lyrx"
    if layer_file.exists():
        layer_file.unlink()

    arcpy.management.SaveToLayerFile(temp_layer, str(layer_file), "RELATIVE")
    layer_file_obj = arcpy.mp.LayerFile(str(layer_file))
    added_layers = map_obj.addLayer(layer_file_obj)
    layer = _coerce_added_layer(added_layers)
    layer.name = LAYER_NAME
    layer.definitionQuery = BROAD_FOCUS_QUERY
    return layer


def _apply_symbology(project: arcpy.mp.ArcGISProject, layer: arcpy.mp.Layer) -> None:
    if not layer.supports("SYMBOLOGY"):
        return

    symbology = layer.symbology
    symbology.updateRenderer("GraduatedColorsRenderer")
    symbology.renderer.classificationField = "prior_years"
    symbology.renderer.classificationMethod = "ManualInterval"
    symbology.renderer.breakCount = 4

    ramps = project.listColorRamps("Yellow-Orange-Red (Continuous)")
    if ramps:
        symbology.renderer.colorRamp = ramps[0]

    breaks = list(getattr(symbology.renderer, "classBreaks", []))
    labels = [
        ("No known prior years", 0),
        ("1-4 years", 4),
        ("5-10 years", 10),
        ("11+ years", 99),
    ]
    if len(breaks) >= len(labels):
        for class_break, (label, upper_bound) in zip(breaks, labels):
            class_break.label = label
            class_break.upperBound = upper_bound

    layer.symbology = symbology
    layer.transparency = 45


def _collect_stats(dataset: str) -> dict[str, object]:
    stats = {
        "parcels": 0,
        "total_acres": 0.0,
        "prior_years_parcels": 0,
        "taxable_vacant_land_parcels": 0,
        "high_priority_candidates": 0,
        "prior_year_bands": {
            "No known prior years": 0,
            "1-4 years": 0,
            "5-10 years": 0,
            "11+ years": 0,
        },
    }

    fields = ["par_calcacreag", "taxdesc", "prior_years"]
    where = BROAD_FOCUS_QUERY
    with arcpy.da.SearchCursor(dataset, fields, where_clause=where) as rows:
        for acreage, taxdesc, prior_years in rows:
            acreage = float(acreage or 0)
            prior_years = int(prior_years or 0)

            stats["parcels"] += 1
            stats["total_acres"] += acreage
            if prior_years > 0:
                stats["prior_years_parcels"] += 1
            if taxdesc == "20 - Taxable":
                stats["taxable_vacant_land_parcels"] += 1
            if acreage >= 0.05 and taxdesc == "20 - Taxable" and prior_years >= 5:
                stats["high_priority_candidates"] += 1

            if prior_years == 0:
                band = "No known prior years"
            elif prior_years <= 4:
                band = "1-4 years"
            elif prior_years <= 10:
                band = "5-10 years"
            else:
                band = "11+ years"
            stats["prior_year_bands"][band] += 1

    stats["total_acres"] = round(stats["total_acres"], 2)
    return stats


def _export_candidates(dataset: str) -> Path:
    EXPORT_DIR.mkdir(exist_ok=True)
    output = EXPORT_DIR / "high_priority_candidates.csv"
    fields = [
        "par_pin",
        "propertyowner",
        "usedesc",
        "taxdesc",
        "par_calcacreag",
        "fairmarkettotal",
        "prior_years",
    ]

    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(fields)
        with arcpy.da.SearchCursor(dataset, fields, where_clause=HIGH_PRIORITY_QUERY) as rows:
            for row in rows:
                writer.writerow(row)

    return output


def main() -> None:
    EXPORT_DIR.mkdir(exist_ok=True)
    project = _current_project()
    sde_connection = _find_sde_connection(project)
    dataset = _dataset_path(sde_connection)

    _message(f"Using live dataset: {dataset}")
    map_obj = _get_or_create_map(project)
    layer = _add_live_layer(map_obj, dataset)
    _apply_symbology(project, layer)

    stats = _collect_stats(dataset)
    stats_path = EXPORT_DIR / "triage_stats.json"
    stats_path.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    candidates_path = _export_candidates(dataset)

    project.save()
    _message(f"Saved project: {project.filePath}")
    _message(f"Wrote stats: {stats_path}")
    _message(f"Wrote candidates: {candidates_path}")


main()
