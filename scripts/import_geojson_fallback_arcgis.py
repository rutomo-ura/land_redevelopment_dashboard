r"""Import exported GeoJSON fallback layers into the current ArcGIS Pro project.

Run from the ArcGIS Pro Python window:

    exec(open(r"C:\rutomo-codefolder\vacant-land-triage-map\scripts\import_geojson_fallback_arcgis.py").read())
"""

from __future__ import annotations

from pathlib import Path

import arcpy


REPO_ROOT = Path(r"C:\rutomo-codefolder\vacant-land-triage-map")
EXPORT_DIR = REPO_ROOT / "exports"
MAP_NAME = "Vacant Land Triage"


def _message(text: str) -> None:
    print(text)
    try:
        arcpy.AddMessage(text)
    except Exception:
        pass


def _project() -> arcpy.mp.ArcGISProject:
    try:
        return arcpy.mp.ArcGISProject("CURRENT")
    except Exception as exc:
        raise RuntimeError("Run this from inside ArcGIS Pro with the project open.") from exc


def _map(project: arcpy.mp.ArcGISProject) -> arcpy.mp.Map:
    maps = project.listMaps(MAP_NAME)
    if maps:
        return maps[0]

    maps = project.listMaps()
    if maps:
        maps[0].name = MAP_NAME
        return maps[0]

    return project.createMap(MAP_NAME, "MAP")


def _json_to_features(project: arcpy.mp.ArcGISProject, name: str) -> str:
    source = EXPORT_DIR / f"{name}.geojson"
    if not source.exists():
        raise FileNotFoundError(source)

    output = str(Path(project.defaultGeodatabase) / name)
    if arcpy.Exists(output):
        arcpy.management.Delete(output)

    arcpy.conversion.JSONToFeatures(str(source), output, "POLYGON")
    return output


def _add_layer(map_obj: arcpy.mp.Map, feature_class: str, layer_name: str) -> arcpy.mp.Layer:
    for layer in map_obj.listLayers():
        if layer.name == layer_name:
            map_obj.removeLayer(layer)

    added = map_obj.addDataFromPath(feature_class)
    layer = added[0] if isinstance(added, list) else added
    layer.name = layer_name
    return layer


def _symbolize_broad(project: arcpy.mp.ArcGISProject, layer: arcpy.mp.Layer) -> None:
    if not layer.supports("SYMBOLOGY"):
        return

    symbology = layer.symbology
    symbology.updateRenderer("GraduatedColorsRenderer")
    symbology.renderer.classificationField = "prior_years"
    symbology.renderer.breakCount = 4

    ramps = project.listColorRamps("Yellow-Orange-Red (Continuous)")
    if ramps:
        symbology.renderer.colorRamp = ramps[0]

    layer.symbology = symbology
    layer.transparency = 45


def main() -> None:
    project = _project()
    map_obj = _map(project)

    broad_fc = _json_to_features(project, "vacant_land_broad")
    broad_layer = _add_layer(map_obj, broad_fc, "Vacant Land Broad")
    _symbolize_broad(project, broad_layer)

    focused_fc = _json_to_features(project, "vacant_land_focused")
    focused_layer = _add_layer(map_obj, focused_fc, "High Priority Candidates")
    focused_layer.transparency = 15

    project.save()
    _message(f"Imported fallback layers and saved {project.filePath}")


main()
