# Latest Live PostgreSQL Export

Generated from the internal GIS PostgreSQL source using read-only queries.

## Files

The generated files are in the ignored `exports/` folder:

| File | Purpose |
| --- | --- |
| `exports/vacant_land_broad.geojson` | Broad map layer for parcels with `par_calcacreag >= 0.05` |
| `exports/vacant_land_focused.geojson` | Focused high-priority map layer |
| `exports/vacant_land_summary.csv` | Basic callout metrics |
| `exports/high_priority_candidates.csv` | Top 100 high-priority candidate table |
| `exports/high_priority_candidates.json` | JSON version of the candidate table |
| `exports/zip_vacancy_penetration.csv` | ZIP-level residential vacancy penetration |
| `exports/neighborhood_vacancy_concentration.csv` | named-neighborhood vacant parcel concentration |
| `reports/vacant_land_area_analysis.html` | short analytical report |
| `reports/assets/neighborhood_vacancy_concentration.png` | chart for zoom-in neighborhood targets |
| `reports/assets/zip_vacancy_penetration.png` | chart for area-average vacancy penetration |
| `webmap/` | publishable ArcGIS Maps SDK web map with report sidebar |
| `webmap/data/vacant_land_triage.geojson` | sanitized multi-use parcel layer for public web map use |
| `docs/data/vacant_land_triage.geojson` | GitHub Pages copy of the public multi-use parcel layer |
| `docs/data/boundary_analysis.json` | chart-ready City neighborhood and Council district summary |
| `webmap/data/boundary_analysis.json` | source web map copy of the boundary summary |

## Key Counts

| Metric | Value |
| --- | ---: |
| Total vacant land parcels | 33,829 |
| Total acres | 15,274.54 |
| Average acres | 0.452 |
| Parcels with prior tax years | 6,948 |
| Taxable vacant land parcels | 18,977 |
| Broad fallback GeoJSON features | 24,228 |
| Focused high-priority GeoJSON features | 3,358 |
| Public multi-use web GeoJSON features | 30,259 |
| Default residential web view features | 20,663 |
| Commercial web view features | 1,561 |
| Public/control grouped parcels: City, URA, PLB, HACP | 9,596 |
| Public or institutional grouped parcels | 10,562 |
| Private/other parcels with 3+ prior years | 5,264 |
| Parcels assigned to City neighborhoods | 30,051 |
| Parcels assigned to Council districts | 30,061 |

## Prior-Year Bands For Broad Fallback Layer

| Band | Parcels |
| --- | ---: |
| No known prior years | 19,094 |
| 1-4 years | 1,725 |
| 5-10 years | 647 |
| 11+ years | 2,762 |

## ArcGIS Pro Fallback Import

If the live `.sde` layer is not cooperating:

Fast scripted import from the ArcGIS Pro Python window:

```python
exec(open(r"C:\rutomo-codefolder\vacant-land-triage-map\scripts\import_geojson_fallback_arcgis.py").read())
```

Manual import:

1. Use `Analysis > Tools > JSON To Features`.
2. Input JSON: `C:\rutomo-codefolder\vacant-land-triage-map\exports\vacant_land_broad.geojson`.
3. Output feature class: save into the project geodatabase as `vacant_land_broad`.
4. Symbolize by `prior_years`.
5. Optionally add `exports/vacant_land_focused.geojson` as a second layer for highlighted candidates.

## Area-Level Analysis

The current analytical direction uses two area lenses:

| Lens | Best use | Current leading areas |
| --- | --- | --- |
| ZIP vacancy penetration | defensible rate using all residential assessment parcels as denominator | `15219`, `15208`, `15235`, `15120`, `15233` |
| Named-neighborhood concentration | place names for zoom-in parcel review | Perry South, Larimer, Hazelwood, Homewood North, Middle Hill, Homewood South |

Important caveat:

- ZIP penetration is a rate.
- Named-neighborhood concentration is not a complete neighborhood vacancy rate because it relies on EPP-linked neighborhood labels.

## Current Publishing Recommendation

Use the static web map first:

1. Citywide ArcGIS web map with cleaned parcel bands and property-use filters.
2. Residential default view for continuity with the current ZIP and neighborhood analysis.
3. Optional commercial, industrial, public/institutional, infrastructure/utility, and review categories.
4. Sidebar report with City neighborhood, Council district, and ZIP charts.
5. Clickable chart rows that draw the selected boundary and filter parcels spatially.
6. Bookmarks for Homewood, Hill District, Perry South, and Larimer.

Keep the ArcGIS Pro layout as a backup export path if a PDF or print deliverable is requested.

## Public Web Data Refresh

Rebuild the public multi-use GeoJSON after updating the reviewed residential extract or the broad export:

```powershell
python scripts\build_public_web_geojson.py
python scripts\enrich_public_boundaries.py
```

The first script omits owner names, derives `prior_band`, and assigns a public `use_group` from county assessment `usedesc`. The second script downloads authoritative WPRDC City neighborhood and 2022 Council district boundaries, assigns parcels by geometry centroid, and writes `boundary_analysis.json` for the native charts.

The public bundle now also includes `ownership_group` and `control_path`. These are public-safe groupings derived from internal owner fields and assessment descriptions; raw owner names remain excluded from GitHub Pages data.
