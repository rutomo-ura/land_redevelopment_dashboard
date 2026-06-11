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
| `webmap/data/vacant_land_residential_triage.geojson` | sanitized residential-focused parcel layer for public web map use |

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

1. Citywide ArcGIS web map with cleaned residential parcel bands.
2. Sidebar report with KPI cards, charts, priority area readout, and caveats.
3. Bookmarks for Homewood, Hill District, Perry South, and Larimer.

Keep the ArcGIS Pro layout as a backup export path if a PDF or print deliverable is requested.
3. Legend with only four prior-year band layers.
4. ZIP penetration chart.
5. Named-neighborhood concentration chart.
