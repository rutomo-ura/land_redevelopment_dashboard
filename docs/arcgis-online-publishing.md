# ArcGIS Online Publishing Notes

This project should be available in two places, matching the LandCare monitoring pattern:

- Public web app: <https://rutomo-ura.github.io/land_redevelopment_dashboard/>
- URA Maps ArcGIS entry: <https://urap.maps.arcgis.com/home/item.html?id=012020b806e74ca6b59606d38f2e318a#overview>

## Current ArcGIS Content

| Role | Value |
|---|---|
| Portal | <https://urap.maps.arcgis.com> |
| Source web map | <https://urap.maps.arcgis.com/apps/mapviewer/index.html?webmap=19022018e35b4b72a2d30cba2d56c8e2> |
| Source web map item ID | `19022018e35b4b72a2d30cba2d56c8e2` |
| URA Maps web app item | <https://urap.maps.arcgis.com/home/item.html?id=012020b806e74ca6b59606d38f2e318a#overview> |
| URA Maps web app item ID | `012020b806e74ca6b59606d38f2e318a` |
| URA Maps target URL | <https://rutomo-ura.github.io/land_redevelopment_dashboard/> |
| Parcel GeoJSON item | <https://urap.maps.arcgis.com/home/item.html?id=c013cc3b5df54a79ae51cccd2baa224f> |
| Parcel data URL | <https://urap.maps.arcgis.com/sharing/rest/content/items/c013cc3b5df54a79ae51cccd2baa224f/data> |

## URA Maps App Shell

Use the ArcGIS Online Document Link item `Vacant Land Redevelopment Explorer` as the public URA Maps entry for this dashboard. This is a separate vacant-land item and should not replace or edit the LandCare monitoring dashboard.

1. In ArcGIS Online, open `Vacant Land Redevelopment Explorer`.
2. In Settings, keep the Document Link URL set to `https://rutomo-ura.github.io/land_redevelopment_dashboard/`.
3. Share the item to the intended audience. Use `Everyone` if the public GitHub Pages app should be reachable without a URA login.
4. Keep `docs/data/layer_sources.json` pointed at this item through `arcgisAppItemId`, `arcgisAppUrl`, and `arcgisAppTargetUrl`.
5. Keep the source web map URL in `webmapUrl` so staff can still open the underlying ArcGIS Map Viewer item.

The deployed dashboard is intentionally the embedded experience. The ArcGIS Online Document Link is the URA Maps entry point, while the dashboard itself loads the configured ArcGIS parcel item when it is publicly accessible and otherwise uses the reviewed public bundle. No outbound URA Maps button is required in the app shell.

## Launch Gate

Before announcing a release, verify all three public paths in an incognito browser:

1. The GitHub Pages dashboard URL loads without an ArcGIS sign-in prompt.
2. The URA Maps Document Link item opens the same dashboard URL.
3. The dashboard's parcel layer, filters, Table view, and one PDF/XLSX export work from that URL.

If the Document Link URL changes, update `arcgisAppTargetUrl` in both `docs/data/layer_sources.json` and `webmap/data/layer_sources.json` in the same release.

## Optional Hosted Feature Layer

The current parcel item is a GeoJSON portal item. If URA wants ArcGIS-native layer behavior:

1. Publish the GeoJSON item as a hosted feature layer.
2. Share the hosted layer with the same audience as the dashboard.
3. Copy the layer URL into `docs/data/layer_sources.json` as `parcelFeatureServiceUrl`.

The web app already attempts sources in this order: hosted feature layer, URA ArcGIS GeoJSON data URL, URA ArcGIS GeoJSON portal item, then the public GitHub Pages GeoJSON bundle.
