# ArcGIS Online Publishing Notes

This project follows the LandCare monitoring pattern: a source-controlled GitHub Pages application embedded inside one ArcGIS Dashboard used as the URA Maps front door.

- Public web app: <https://rutomo-ura.github.io/land_redevelopment_dashboard/>
- URA Maps dashboard: <https://urap.maps.arcgis.com/apps/dashboards/9552e95d319b4e2180219ae66b3c8d65>

## Current ArcGIS Content

| Role | Value |
|---|---|
| Portal | <https://urap.maps.arcgis.com> |
| Public front door | [Vacant Land Redevelopment Explorer Dashboard](https://urap.maps.arcgis.com/apps/dashboards/9552e95d319b4e2180219ae66b3c8d65) |
| Dashboard item ID | `9552e95d319b4e2180219ae66b3c8d65` |
| Embedded app URL | <https://rutomo-ura.github.io/land_redevelopment_dashboard/> |
| Source web map | <https://urap.maps.arcgis.com/apps/mapviewer/index.html?webmap=19022018e35b4b72a2d30cba2d56c8e2> |
| Source web map item ID | `19022018e35b4b72a2d30cba2d56c8e2` |
| Parcel GeoJSON item | <https://urap.maps.arcgis.com/home/item.html?id=c013cc3b5df54a79ae51cccd2baa224f> |
| Parcel data URL | <https://urap.maps.arcgis.com/sharing/rest/content/items/c013cc3b5df54a79ae51cccd2baa224f/data> |

## ArcGIS Dashboard Shell

Use `Vacant Land Redevelopment Explorer Dashboard` as the only public URA Maps entry. It embeds the GitHub Pages application and should be shared with the intended audience; use `Everyone` when the dashboard is expected to work without a URA login.

Keep `docs/data/layer_sources.json` and `webmap/data/layer_sources.json` aligned with the Dashboard item ID and URL. Keep `webmapUrl` so staff can access the underlying ArcGIS Map Viewer item.

## Launch Gate

Before announcing a release, verify all three paths in an incognito browser:

1. The GitHub Pages dashboard loads without an ArcGIS sign-in prompt.
2. The ArcGIS Dashboard loads and displays the embedded app.
3. The app's parcel layer, filters, Table view, and one PDF/XLSX export work from the embedded experience.

## Optional Hosted Feature Layer

The current parcel item is a GeoJSON portal item. If URA wants ArcGIS-native layer behavior:

1. Publish the GeoJSON item as a hosted feature layer.
2. Share the hosted layer with the same audience as the dashboard.
3. Copy the layer URL into `docs/data/layer_sources.json` as `parcelFeatureServiceUrl`.

The web app already attempts sources in this order: hosted feature layer, URA ArcGIS GeoJSON data URL, URA ArcGIS GeoJSON portal item, then the public GitHub Pages GeoJSON bundle.
