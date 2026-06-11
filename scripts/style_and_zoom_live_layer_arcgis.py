r"""Make the live vacant land layer obvious and zoom to it.

Run from the ArcGIS Pro Python window:

    exec(open(r"C:\rutomo-codefolder\vacant-land-triage-map\scripts\style_and_zoom_live_layer_arcgis.py").read())
"""

from __future__ import annotations

import arcpy


MAP_NAME = "Vacant Land Triage"
LAYER_NAME = "Vacant Land Parcels"
BROAD_FOCUS_QUERY = "par_calcacreag >= 0.05"


def _message(text: str) -> None:
    print(text)
    try:
        arcpy.AddMessage(text)
    except Exception:
        pass


def _find_layer(project: arcpy.mp.ArcGISProject) -> tuple[arcpy.mp.Map, arcpy.mp.Layer]:
    maps = project.listMaps(MAP_NAME) or project.listMaps()
    for map_obj in maps:
        for layer in map_obj.listLayers():
            if layer.name == LAYER_NAME:
                return map_obj, layer
    raise RuntimeError(f"Layer not found: {LAYER_NAME}")


def _force_visible_style(layer: arcpy.mp.Layer) -> None:
    layer.visible = True
    layer.definitionQuery = BROAD_FOCUS_QUERY
    layer.transparency = 0

    if not layer.supports("SYMBOLOGY"):
        return

    symbology = layer.symbology
    symbology.updateRenderer("SimpleRenderer")
    symbol = symbology.renderer.symbol
    symbol.color = {"RGB": [255, 80, 40, 70]}
    symbol.outlineColor = {"RGB": [130, 0, 0, 100]}
    symbol.size = 1
    symbology.renderer.symbol = symbol
    layer.symbology = symbology


def _zoom_to_layer(project: arcpy.mp.ArcGISProject, map_obj: arcpy.mp.Map, layer: arcpy.mp.Layer) -> None:
    view = project.activeView
    if hasattr(view, "getLayerExtent"):
        extent = view.getLayerExtent(layer, False, True)
    else:
        extent = layer.getExtent() if hasattr(layer, "getExtent") else None

    if not extent:
        _message("Could not calculate layer extent.")
        return

    if hasattr(view, "camera"):
        view.camera.setExtent(extent)
        view.camera.scale *= 1.15
        _message("Zoomed active map view to layer extent.")
        return

    map_obj.defaultCamera.setExtent(extent)
    map_obj.defaultCamera.scale *= 1.15
    _message("Set map default camera to layer extent.")


def main() -> None:
    project = arcpy.mp.ArcGISProject("CURRENT")
    map_obj, layer = _find_layer(project)
    _force_visible_style(layer)
    _zoom_to_layer(project, map_obj, layer)
    project.save()
    _message(f"Styled and zoomed layer: {LAYER_NAME}")


main()
