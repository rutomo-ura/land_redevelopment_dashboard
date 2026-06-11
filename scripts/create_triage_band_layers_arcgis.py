r"""Create readable live triage band layers from the SDE source.

This makes four live layers with clear legend names instead of one blank
single-symbol legend entry.

Run from the ArcGIS Pro Python window:

    exec(open(r"C:\rutomo-codefolder\vacant-land-triage-map\scripts\create_triage_band_layers_arcgis.py").read())
"""

from __future__ import annotations

import os

import arcpy


SDE_CONNECTION = (
    globals().get("SDE_CONNECTION")
    or r"C:\Users\rutomo\OneDrive - Urban Redevelopment Authority of Pittsburgh\Documents\ArcGIS\Projects\VacantLandRedevelopmentTriage\URA_GISDB.sde"
)
DATASET_NAME = "gis.calculated_vacant_land"
MAP_NAME = "Vacant Land Triage"
SOURCE_LAYER_NAME = "Vacant Land Parcels"
RESIDENTIAL_BASE_QUERY = """
par_calcacreag >= 0.01
AND par_calcacreag <= 2
AND usedesc IS NOT NULL
AND usedesc NOT IN (
    'MUNICIPAL GOVERNMENT',
    'MUNICIPAL URBAN RENEWAL',
    'COUNTY GOVERNMENT',
    'STATE GOVERNMENT',
    'FEDERAL GOVERNMENT',
    'TOWNSHIP GOVERNMENT',
    'OWNED BY BOARD OF EDUCATION',
    'OWNED BY COLLEGE/UNIV/ACADEMY',
    'OWNED BY METRO HOUSING AU',
    'PUBLIC PARK',
    'R.R. - USED IN OPERATION',
    'R.R. - NOT USED IN OPERATION',
    'VACANT COMMERCIAL LAND',
    'VACANT INDUSTRIAL LAND',
    'COMMERCIAL/UTILITY',
    'PARKING GARAGE/LOTS',
    'CEMETERY/MONUMENTS',
    'AIR RIGHTS',
    'RIGHT OF WAY - RESIDENTIAL',
    'RIGHT OF WAY - COMMERCIAL',
    'RETENTION POND - RESIDENTIAL',
    'COMMERCIAL GARAGE',
    'DISTRIBUTION WAREHOUSE',
    'WAREHOUSE',
    'WAREHOUSE/MULTI-TENANT',
    'MINI WAREHOUSE',
    'OFFICE/WAREHOUSE',
    'OFFICE-ELEVATOR -3 + STORIES',
    'CONDOMINIUM OFFICE BUILDING',
    'CHURCHES, PUBLIC WORSHIP'
)
AND (
    usedesc IN (
        'VACANT LAND',
        'BUILDERS LOT',
        'SINGLE FAMILY',
        'TWO FAMILY',
        'THREE FAMILY',
        'FOUR FAMILY',
        'ROWHOUSE',
        'TOWNHOUSE',
        'RES AUX BUILDING (NO HOUSE)',
        'CONDO DEVELOPMENTAL LAND'
    )
    OR usedesc LIKE 'APART:%'
)
""".strip()

BANDS = [
    {
        "name": "No known prior years",
        "where": f"{RESIDENTIAL_BASE_QUERY} AND (prior_years IS NULL OR prior_years = 0)",
        "fill": [190, 196, 197, 55],
        "outline": [112, 120, 122, 80],
    },
    {
        "name": "1-4 prior years",
        "where": f"{RESIDENTIAL_BASE_QUERY} AND prior_years BETWEEN 1 AND 4",
        "fill": [236, 190, 82, 65],
        "outline": [145, 105, 28, 90],
    },
    {
        "name": "5-10 prior years",
        "where": f"{RESIDENTIAL_BASE_QUERY} AND prior_years BETWEEN 5 AND 10",
        "fill": [74, 146, 155, 70],
        "outline": [25, 92, 104, 95],
    },
    {
        "name": "11+ prior years",
        "where": f"{RESIDENTIAL_BASE_QUERY} AND prior_years >= 11",
        "fill": [98, 78, 145, 75],
        "outline": [54, 40, 94, 100],
    },
]


def _message(text: str) -> None:
    print(text)
    try:
        arcpy.AddMessage(text)
    except Exception:
        pass


def _project() -> arcpy.mp.ArcGISProject:
    return arcpy.mp.ArcGISProject("CURRENT")


def _map(project: arcpy.mp.ArcGISProject) -> arcpy.mp.Map:
    maps = project.listMaps(MAP_NAME) or project.listMaps()
    if maps:
        return maps[0]
    return project.createMap(MAP_NAME, "MAP")


def _dataset_path() -> str:
    dataset = os.path.join(SDE_CONNECTION, DATASET_NAME)
    if not arcpy.Exists(dataset):
        raise RuntimeError(f"Dataset not found or not accessible: {dataset}")
    return dataset


def _remove_old_band_layers(map_obj: arcpy.mp.Map) -> None:
    band_names = {band["name"] for band in BANDS}
    for layer in list(map_obj.listLayers()):
        normalized = layer.name.strip()
        if normalized in band_names or any(normalized.startswith(f"{name}_") for name in band_names):
            map_obj.removeLayer(layer)


def _style_simple_polygon(layer: arcpy.mp.Layer, fill: list[int], outline: list[int]) -> None:
    if not layer.supports("SYMBOLOGY"):
        return

    symbology = layer.symbology
    symbology.updateRenderer("SimpleRenderer")
    symbol = symbology.renderer.symbol
    symbol.color = {"RGB": fill}
    symbol.outlineColor = {"RGB": outline}
    symbol.size = 0.7
    symbology.renderer.symbol = symbol
    layer.symbology = symbology
    layer.transparency = 0


def _add_band_layer(map_obj: arcpy.mp.Map, dataset: str, band: dict[str, object]) -> arcpy.mp.Layer:
    prior_add_outputs = arcpy.env.addOutputsToMap
    try:
        arcpy.env.addOutputsToMap = False
        result = arcpy.management.MakeFeatureLayer(
            dataset,
            str(band["name"]),
            where_clause=str(band["where"]),
        )
    finally:
        arcpy.env.addOutputsToMap = prior_add_outputs
    layer_object = result.getOutput(0)
    added = map_obj.addLayer(layer_object)
    layer = added[0] if isinstance(added, list) else added
    layer.name = str(band["name"])
    layer.definitionQuery = str(band["where"])
    layer.visible = True
    _style_simple_polygon(layer, band["fill"], band["outline"])
    return layer


def main() -> None:
    project = _project()
    map_obj = _map(project)
    dataset = _dataset_path()

    _remove_old_band_layers(map_obj)

    for band in BANDS:
        _add_band_layer(map_obj, dataset, band)

    for source_layer in map_obj.listLayers(SOURCE_LAYER_NAME):
        source_layer.visible = False
    for temp_layer in map_obj.listLayers("vacant_land_parcels_live_temp"):
        temp_layer.visible = False

    project.save()
    _message("Created four live triage band layers with readable legend names.")


main()
