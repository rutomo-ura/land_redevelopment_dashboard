# Vacant Land Triage Analyst Workflow

## Purpose

Build an ArcGIS Pro map and short analytical story that answers:

> Where is residential-ish vacant land concentrated, which areas have the highest vacancy penetration, and which parcel clusters deserve closer review?

The best final product is not only a parcel map. It should combine:

- a cleaned live parcel layer for detailed inspection
- an area-level comparison chart for ZIP vacancy penetration
- a named-neighborhood concentration chart for zoom-in targets
- a publishable ArcGIS web map that moves from citywide pattern to parcel-level detail

## Ground Rules

- Keep PostgreSQL read-only.
- Treat `.sde` layers as live source layers, not editable layers.
- Do not save edits back to the database.
- Use exports only as local analytical artifacts in `exports/` and `reports/`.
- When a result looks strange, inspect `usedesc`, acreage, and geometry before accepting it as an insight.

## 1. Start From The Analytical Question

Use this framing before touching layout tools:

1. **Citywide view:** Where are residential-ish vacant parcels concentrated?
2. **Area-average view:** Which ZIPs have the highest vacant parcel penetration among residential parcels?
3. **Zoom-in view:** Which named neighborhoods or clusters should someone inspect parcel-by-parcel?
4. **Data quality view:** Which visible shapes are probably roads, rail, parks, right-of-way, or large anomaly parcels?

The current working answer:

- Strong named-neighborhood concentrations include Perry South, Larimer, Hazelwood, Homewood North, Middle Hill, and Homewood South.
- Strong ZIP penetration areas include `15219`, `15208`, `15235`, `15120`, `15233`, `15214`, and `15221`.
- A good final map should include both a citywide view and a zoom-in inset around Homewood/Hill District or Larimer/Perry South.

## 2. Clean The Parcel Layer

The raw layer includes obvious non-residential or anomaly shapes such as rail, right-of-way, public land, commercial/industrial land, utility land, parks, and very large polygons. Use the cleaned band-layer script instead of the raw all-parcel layer:

```python
exec(open(r"C:\rutomo-codefolder\vacant-land-triage-map\scripts\create_triage_band_layers_arcgis.py").read())
```

This creates four live SDE query layers:

| Layer | Meaning | Style |
| --- | --- | --- |
| `No known prior years` | `prior_years IS NULL OR prior_years = 0` | neutral gray |
| `1-4 prior years` | low-to-moderate delinquency history | gold |
| `5-10 prior years` | higher delinquency history | teal |
| `11+ prior years` | longest delinquency history | muted purple |

The script applies a residential-ish filter:

- keeps parcels between `0.01` and `2` acres
- keeps likely residential/vacant descriptions such as `VACANT LAND`, `BUILDERS LOT`, `SINGLE FAMILY`, `ROWHOUSE`, `TOWNHOUSE`, and `APART:%`
- excludes obvious infrastructure, public, commercial, industrial, right-of-way, railroad, utility, park, cemetery, air-rights, warehouse, and office categories

If the legend duplicates again, rerun the same script. It now disables ArcGIS auto-adding geoprocessing outputs and removes prior band layers before recreating them.

## 3. Generate Area-Level Evidence

Run the area-analysis export when the local `exports/` files need refreshing:

```powershell
$env:PGPASSWORD = "<password>"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\export_area_analysis.ps1 -HostName $env:PGHOST -Port 5432 -Database $env:PGDATABASE -Username $env:PGUSER
Remove-Item Env:\PGPASSWORD
```

Outputs:

| File | Use |
| --- | --- |
| `exports/zip_vacancy_penetration.csv` | ZIP-level vacancy penetration using residential assessment parcels as denominator |
| `exports/neighborhood_vacancy_concentration.csv` | named-neighborhood concentration using EPP-linked neighborhoods |

Important distinction:

- ZIP penetration is better for a defensible rate because the denominator is all residential assessment parcels.
- Neighborhood concentration is better for naming places to zoom into, but it is based on EPP-linked neighborhood labels and should not be described as a complete citywide neighborhood vacancy rate.

## 4. Render Charts And Report

Run:

```powershell
$env:PYTHONPATH = "C:\rutomo-codefolder\land-care-assurance\outputs\week-1-day-1\.python-packages"
$env:MPLCONFIGDIR = "C:\rutomo-codefolder\vacant-land-triage-map\.matplotlib-cache"
& "C:\Users\rutomo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" scripts\render_area_analysis_report.py
```

Outputs:

| File | Use |
| --- | --- |
| `reports/vacant_land_area_analysis.html` | short analytical report |
| `reports/assets/neighborhood_vacancy_concentration.png` | chart for named-neighborhood zoom-in targets |
| `reports/assets/zip_vacancy_penetration.png` | chart for ZIP-level rate comparison |

Use the PNG charts as evidence panels in the web map sidebar or ArcGIS layout.

## 5. Build The Publishable Web Map

The current publishable artifact is:

```text
C:\rutomo-codefolder\vacant-land-triage-map\webmap
```

It combines:

- an ArcGIS Maps SDK for JavaScript map
- a sanitized residential-focused GeoJSON parcel layer
- sidebar KPI cards, chart images, area readout, and analyst caveats
- map filters for prior-year bands
- bookmarks for citywide, Homewood, Hill District, Perry South, and Larimer

Run it locally from the repository root:

```powershell
py -m http.server 8787
```

Then open:

```text
http://127.0.0.1:8787/webmap/
```

Publish by uploading the full `webmap/` folder to a static web host while keeping relative paths intact.

The public web map GeoJSON omits owner names. Use the live PostgreSQL/SDE workflow for internal owner-level parcel review.

## 6. Optional ArcGIS Layout

Recommended layout structure:

1. Title: `Vacant Land Redevelopment Triage`
2. Main map: citywide cleaned parcel bands
3. Inset map: Homewood/Hill District or Larimer/Perry South cluster
4. Legend: only the four prior-year band layers
5. Chart panel 1: named-neighborhood concentration
6. Chart panel 2: ZIP vacancy penetration
7. Three short callouts:
   - `Perry South, Larimer, Hazelwood, and Homewood show the largest named-neighborhood concentrations.`
   - `ZIPs 15219 and 15208 have the highest residential vacancy penetration among large ZIPs.`
   - `Parcel-level review should focus on clusters, not isolated outliers.`

Do not let the legend dominate the page. The legend should explain the parcel colors; the charts should carry the area-level evidence.

## 7. Analyst QA Checklist

Before exporting the final map:

- Confirm only four triage band layers are visible in the Contents pane.
- Confirm the raw `Vacant Land Parcels` layer is hidden unless used for debugging.
- Confirm the web map loads the sanitized GeoJSON and owner names are not present.
- Pan around busway, rail, riverfront, and park areas to make sure noisy polygons are reduced.
- Click a few suspicious polygons and inspect `usedesc`, `par_calcacreag`, and `prior_years`.
- Confirm the map title says "triage" or "exploratory," not "final recommendation."
- Confirm the ZIP chart is described as a rate and the neighborhood chart is described as concentration.
- Confirm all callouts match the exported CSV/report numbers.

## 8. Suggested Talk Track

Short version:

> I built an exploratory vacant land triage view from the live URA GIS PostgreSQL database. I filtered the raw vacant land layer to focus on residential-ish parcels and remove obvious infrastructure and anomaly shapes. The map shows parcel-level clusters by delinquency history, while the charts summarize where vacancy is concentrated by named neighborhood and where residential vacancy penetration is highest by ZIP. This gives us a practical way to move from citywide pattern recognition to parcel-level follow-up in places like Perry South, Larimer, Hazelwood, Homewood, and the Hill District.

## 9. Next Analytical Improvements

- Add true neighborhood boundary polygons if available, then compute neighborhood vacancy rate directly.
- Add zoning or planning context to distinguish redevelopment suitability from simple vacancy concentration.
- Add ownership categories to separate public, institutional, and private follow-up paths.
- Add proximity filters for transit, schools, corridors, or active redevelopment areas.
- Review outlier polygons by `usedesc` and acreage before presenting parcel-level recommendations.

## 10. Useful Files

| File | Purpose |
| --- | --- |
| `scripts/create_triage_band_layers_arcgis.py` | creates cleaned live ArcGIS band layers |
| `scripts/export_area_analysis.ps1` | exports ZIP and neighborhood analytical tables |
| `scripts/render_area_analysis_report.py` | renders report and PNG charts |
| `sql/area_vacancy_analysis.sql` | reproducible area-level analysis SQL |
| `reports/vacant_land_area_analysis.html` | current analytical report |
| `webmap/index.html` | publishable map and sidebar report |
| `webmap/data/vacant_land_residential_triage.geojson` | sanitized web map parcel data |
| `docs/latest_export_summary.md` | latest generated-output summary |
