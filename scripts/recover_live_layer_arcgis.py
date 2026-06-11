r"""Recover the live vacant land layer in the current ArcGIS Pro project.

This script only adds or refreshes the live SDE layer. It does not remove any
map layers.

Run from the ArcGIS Pro Python window:

    exec(open(r"C:\rutomo-codefolder\vacant-land-triage-map\scripts\recover_live_layer_arcgis.py").read())
"""

from __future__ import annotations

import os
from pathlib import Path

import arcpy


SDE_CONNECTION = (
    globals().get("SDE_CONNECTION")
    or r"C:\Users\rutomo\OneDrive - Urban Redevelopment Authority of Pittsburgh\Documents\ArcGIS\Projects\VacantLandRedevelopmentTriage\URA_GISDB.sde"
)
DATASET_NAME = "gis.calculated_vacant_land"
MAP_NAME = "Vacant Land Triage"
LAYER_NAME = "Vacant Land Parcels"
BROAD_FOCUS_QUERY = "par_calcacreag >= 0.05"


def _message(text: str) -> None:
    print(text)
    try:
        arcpy.AddMessage(text)
    except Exception:
        pass


def _project() -> arcpy.mp.ArcGISProject:
    return arcpy.mp.ArcGISProject("CURRENT")


def _map(project: arcpy.mp.ArcGISProject) -> arcpy.mp.Map:
    maps = project.listMaps(MAP_NAME)
    if maps:
        return maps[0]
    maps = project.listMaps()
    if maps:
        return maps[0]
    return project.createMap(MAP_NAME, "MAP")


def _dataset_path() -> str:
    direct = os.path.join(SDE_CONNECTION, DATASET_NAME)
    if arcpy.Exists(direct):
        return direct
    raise RuntimeError(f"Dataset not found or not accessible: {direct}")


def main() -> None:
    project = _project()
    map_obj = _map(project)
    dataset = _dataset_path()

    for layer in map_obj.listLayers():
        if layer.name == LAYER_NAME:
            layer.definitionQuery = BROAD_FOCUS_QUERY
            _message(f"Layer already exists; refreshed definition query: {LAYER_NAME}")
            project.save()
            return

    result = arcpy.management.MakeFeatureLayer(
        dataset,
        LAYER_NAME,
        where_clause=BROAD_FOCUS_QUERY,
    )
    layer_object = result.getOutput(0)
    added = map_obj.addLayer(layer_object)
    layer = added[0] if isinstance(added, list) else added
    if layer:
        layer.name = LAYER_NAME
        layer.definitionQuery = BROAD_FOCUS_QUERY
        layer.transparency = 45

    project.save()
    _message(f"Recovered live layer: {LAYER_NAME}")


main()
