# Vacant Land Redevelopment Triage Map

This repository publishes a lightweight web map and analysis package for exploring
vacant land redevelopment triage in Pittsburgh. It combines a public-facing
ArcGIS Maps SDK parcel map, prior-year delinquency bands, ZIP and neighborhood
context charts, and the SQL/scripts used to reproduce the analysis from the
read-only source data.

## Published Links

- GitHub Pages web app: <https://rutomo-ura.github.io/vacant-land-triage-map/>
- ArcGIS Online item: <https://urap.maps.arcgis.com/home/item.html?id=19022018e35b4b72a2d30cba2d56c8e2>

## What Is In The Web App

- Full citywide parcel map for the residential-focused vacant land extract.
- Prior-year triage filters for `No known prior years`, `1-4`, `5-10`, and `11+`.
- Bookmarks for citywide review plus Homewood, Hill District, Perry South, and Larimer.
- KPI cards, priority-area readout, and contextual charts for ZIP vacancy penetration
  and named-neighborhood concentration.
- A public bundle that omits owner names and keeps internal database access out of the
  static site.

## Current Analysis Highlights

- The public web map includes 20,488 residential-focused vacant parcels.
- 3,590 mapped parcels fall in the `11+ prior years` triage band.
- ZIPs `15219` and `15208` show the strongest rate-based vacancy signals in the
  current extract.
- Perry South, Larimer, Hazelwood, Homewood North, Middle Hill, and Homewood South
  are the clearest named-neighborhood cluster review areas.

## Goal

Build a quick ArcGIS Pro map that helps answer:

> Where are vacant land parcels, and which ones may be higher-priority because they are larger, taxable, or have longer delinquency history?

This is designed as a 3-hour kickoff project. Keep it simple, visual, and explainable.

## Safety Rules

- Do not modify the database.
- Use only `SELECT` queries.
- Do not run `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, or `REVOKE`.
- Do not save edited data back to PostgreSQL.
- In ArcGIS Pro, treat database layers as source/read-only layers.

Recommended SQL session guard:

```sql
BEGIN READ ONLY;
```

When done:

```sql
ROLLBACK;
```

## Dataset

Primary dataset:

```text
gis.calculated_vacant_land
```

Why this dataset works well:

- It already has polygon geometry: `shape`
- Geometry type: `MULTIPOLYGON`
- Spatial reference: SRID `4326`
- It includes parcel identifiers, acreage, assessment values, owner/use fields, tax status, and delinquency history
- It does not require joins for a first map

Useful fields:

| Field | Use |
| --- | --- |
| `par_pin` | Parcel identifier |
| `shape` | Parcel geometry |
| `par_calcacreag` | Parcel acreage |
| `fairmarketbuilding` | Building value |
| `fairmarkettotal` | Total fair market value |
| `propertyowner` | Owner name for internal analyst workflows; omitted from the public web map bundle |
| `usedesc` | Use description |
| `taxdesc` | Tax status description |
| `prior_years` | Number of prior delinquent tax years |

## Fast Project Plan

Afternoon companion files:

- `docs/afternoon_arcgis_work_plan.md` gives the step-by-step working checklist.
- `sql/vacant_land_read_only_exploration.sql` packages the read-only SQL exploration queries.
- `templates/arcgis_popup_template.txt` has the popup text for ArcGIS Pro.
- `scripts/build_live_arcgis_map.py` can build the map from a live ArcGIS `.sde` connection inside ArcGIS Pro.
- `scripts/export_postgres_snapshot.ps1` is the CSV/JSON fallback if live ArcGIS data access is blocked.
- `scripts/import_geojson_fallback_arcgis.py` imports the generated GeoJSON fallback into ArcGIS Pro.
- `scripts/style_and_zoom_live_layer_arcgis.py` makes the live layer visually obvious and zooms to it.
- `scripts/create_triage_band_layers_arcgis.py` creates four readable live legend layers by prior-year band.
- `scripts/export_area_analysis.ps1` exports ZIP penetration and named-neighborhood concentration tables.
- `scripts/render_area_analysis_report.py` creates the analytical HTML report and chart PNGs.
- `sql/area_vacancy_analysis.sql` documents the area-level SQL logic.
- `reports/vacant_land_area_analysis.html` is the current analysis report.
- `webmap/` is the publishable ArcGIS Maps SDK web map with report sidebar.
- `docs/index.html` is the GitHub Pages copy of the web app.

### Hour 1: Connect and Add Data

1. Open ArcGIS Pro.
2. Create a new project.
3. In the Catalog pane, expand or create the PostgreSQL database connection.
4. Add this layer to the map:

```text
gis.calculated_vacant_land
```

5. Confirm the layer draws as polygons.
6. Open the attribute table and inspect these fields:

```text
par_pin
par_calcacreag
fairmarkettotal
propertyowner
usedesc
taxdesc
prior_years
```

### Hour 2: Symbolize and Filter

Create a simple priority-style symbology using `prior_years`.

Suggested classes:

| Label | Expression |
| --- | --- |
| No known prior years | `prior_years IS NULL OR prior_years = 0` |
| 1-4 years | `prior_years BETWEEN 1 AND 4` |
| 5-10 years | `prior_years BETWEEN 5 AND 10` |
| 11+ years | `prior_years >= 11` |

Suggested visual style:

- Neutral gray for no known prior years
- Light yellow/orange for 1-4 years
- Orange/red for 5-10 years
- Dark red for 11+ years
- Thin white or dark outline
- 40-60% transparency so basemap context remains visible

Optional definition query for a focused map:

```sql
par_calcacreag >= 0.05
```

Optional stronger focus:

```sql
par_calcacreag >= 0.05
AND taxdesc = '20 - Taxable'
AND prior_years >= 5
```

### Hour 3: Layout and Talking Points

Create a layout with:

- Map title: `Vacant Land Redevelopment Triage`
- Legend
- Scale bar
- North arrow
- Basemap
- 3-4 callout stats
- One chart or table summary

Suggested callout stats:

- Total vacant land parcels
- Total acres
- Parcels with prior delinquency years
- Taxable vacant land parcels

Suggested presentation framing:

1. This map is an exploratory triage view, not a final decision tool.
2. It highlights parcels that may deserve follow-up review.
3. The first version avoids joins and edits, so it can be built safely and quickly.
4. Next steps could add neighborhood boundaries, zoning, ownership filters, or redevelopment suitability criteria.

## SQL Exploration Queries

Run these in pgAdmin or another SQL client. They are read-only.

### Start a Read-Only Session

```sql
BEGIN READ ONLY;
```

### Confirm Geometry Registration

```sql
SELECT
    f_table_schema,
    f_table_name,
    f_geometry_column,
    srid,
    type
FROM public.geometry_columns
WHERE f_table_schema = 'gis'
  AND f_table_name = 'calculated_vacant_land';
```

### Preview Columns

```sql
SELECT
    ordinal_position,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'gis'
  AND table_name = 'calculated_vacant_land'
ORDER BY ordinal_position;
```

### Basic Summary

```sql
SELECT
    COUNT(*) AS parcels,
    ROUND(SUM(par_calcacreag)::numeric, 2) AS total_acres,
    ROUND(AVG(par_calcacreag)::numeric, 3) AS avg_acres,
    ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY par_calcacreag)::numeric,
        3
    ) AS median_acres,
    COUNT(*) FILTER (WHERE prior_years > 0) AS parcels_with_prior_tax_years,
    COUNT(*) FILTER (WHERE fairmarkettotal > 0) AS parcels_with_fmv
FROM gis.calculated_vacant_land;
```

### Top Use Descriptions

```sql
SELECT
    usedesc,
    COUNT(*) AS parcels,
    ROUND(SUM(par_calcacreag)::numeric, 2) AS acres
FROM gis.calculated_vacant_land
GROUP BY usedesc
ORDER BY parcels DESC
LIMIT 15;
```

### Tax Status Summary

```sql
SELECT
    taxdesc,
    COUNT(*) AS parcels,
    ROUND(SUM(par_calcacreag)::numeric, 2) AS acres
FROM gis.calculated_vacant_land
GROUP BY taxdesc
ORDER BY parcels DESC;
```

### Prior Delinquency Years Summary

```sql
SELECT
    prior_years,
    COUNT(*) AS parcels,
    ROUND(SUM(par_calcacreag)::numeric, 2) AS acres
FROM gis.calculated_vacant_land
GROUP BY prior_years
ORDER BY prior_years NULLS FIRST;
```

### Candidate High-Priority Parcels

Use this as an exploration table, not as a final decision list.

```sql
SELECT
    par_pin,
    propertyowner,
    usedesc,
    taxdesc,
    par_calcacreag,
    fairmarkettotal,
    prior_years
FROM gis.calculated_vacant_land
WHERE par_calcacreag >= 0.05
  AND taxdesc = '20 - Taxable'
  AND prior_years >= 5
ORDER BY prior_years DESC, par_calcacreag DESC
LIMIT 100;
```

### Large Vacant Parcels

```sql
SELECT
    par_pin,
    propertyowner,
    usedesc,
    taxdesc,
    par_calcacreag,
    fairmarkettotal,
    prior_years
FROM gis.calculated_vacant_land
WHERE par_calcacreag >= 0.5
ORDER BY par_calcacreag DESC
LIMIT 100;
```

### Finish Without Changing Anything

```sql
ROLLBACK;
```

## ArcGIS Popup Template

Configure popups to show:

```text
Parcel PIN: {par_pin}
Owner: {propertyowner}
Use: {usedesc}
Tax Status: {taxdesc}
Acreage: {par_calcacreag}
Fair Market Total: {fairmarkettotal}
Prior Delinquency Years: {prior_years}
```

## Optional Chart Ideas

In ArcGIS Pro, create charts from the layer:

1. Bar chart: parcel count by `usedesc`
2. Bar chart: parcel count by `taxdesc`
3. Histogram: `par_calcacreag`
4. Bar chart: parcel count by `prior_years`

## Presentation Script

Short version:

> I built a first-pass vacant land triage map from the URA GIS PostgreSQL/PostGIS database. The layer uses existing parcel geometry and attributes, with no database edits. I symbolized parcels by prior delinquency years and used acreage, tax status, use description, and fair market value as context. This gives the team a quick way to spot parcels that may deserve follow-up review for redevelopment, acquisition, or data quality checks.

## Things to Verify Later

- Confirm the exact intended geography of `gis.calculated_vacant_land`.
- Confirm whether `prior_years` means tax delinquency history from the current tax dataset.
- Ask whether a neighborhood, council district, or zoning boundary should be added.
- Ask whether the final version should be published to ArcGIS Online or kept as an internal ArcGIS Pro project.
