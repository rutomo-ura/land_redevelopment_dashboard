# Vacant Land Redevelopment Explorer Web Map

Static ArcGIS Maps SDK for JavaScript app with a report sidebar and a sanitized multi-use vacant parcel GeoJSON. The app opens in a residential default view and lets users add commercial, industrial, public/institutional, infrastructure/utility, and review categories.

## Run locally

From the repository root:

```powershell
py -m http.server 8787
```

Open:

```text
http://127.0.0.1:8787/webmap/
```

## Publish

There are two good ArcGIS Online publishing paths.

### Path A: ArcGIS Online-native app

Use this if URA wants the app to live fully inside ArcGIS Online:

1. Sign in to `https://urap.maps.arcgis.com`.
2. Go to `Content > My content > New item > Your device`.
3. Upload `webmap/data/vacant_land_triage.geojson`.
4. Choose `Add vacant_land_triage.geojson and create a hosted layer`.
5. Title the layer `Vacant Land Redevelopment Explorer Parcels`.
6. Add tags such as `vacant land`, `URA`, `Pittsburgh`, `redevelopment`, `residential`, `commercial`.
7. Open the hosted feature layer in Map Viewer.
8. Symbolize `prior_band` with the same four colors used in `app.js`.
9. Configure popups with `par_pin`, `use_group`, `prior_years`, `usedesc`, `taxdesc`, `par_calcacreag`, and `fairmarkettotal`.
10. Save the web map as `Vacant Land Redevelopment Explorer`.
11. Create an ArcGIS Experience Builder or Instant Apps app from the web map.
12. Recreate the sidebar report with the KPI text and chart images from `webmap/assets/`.
13. Share the layer, web map, and app with the URA organization or the configured gallery group.

### Path B: Custom static web app

Use this if URA wants the exact HTML/CSS/JavaScript sidebar app in this folder:

Upload the `webmap` folder to any static web host or ArcGIS-compatible web hosting path. Keep the relative paths intact:

- `index.html`
- `styles.css`
- `app.js`
- `assets/*.png`
- `data/vacant_land_triage.geojson`

Then, in ArcGIS Online, create a new `Application` item that points to the hosted URL and share that app item with the URA organization or the configured gallery group.

The parcel GeoJSON omits owner names for a safer public-facing bundle. `scripts/build_public_web_geojson.py` rebuilds the public web data from the residential reviewed layer and the broader vacant-land export. Run `scripts/enrich_public_boundaries.py` afterward to add authoritative City neighborhood and Council district assignments. Keep using the live PostgreSQL or SDE layer for internal analyst workflows when ownership is needed.
