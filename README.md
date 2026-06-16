# Vacant Land Redevelopment Explorer

An interactive public map for exploring vacant land patterns in Pittsburgh, with a residential default view and optional commercial, industrial, public, infrastructure, and review categories.

This project helps planners, analysts, and neighborhood partners see where vacant parcels are clustered, where long delinquency histories may warrant closer review, and which areas may need a more detailed redevelopment, acquisition, maintenance, or data-quality conversation.

## Explore The Map

- Live web app: <https://rutomo-ura.github.io/land_redevelopment_dashboard/>
- Ownership view: <https://rutomo-ura.github.io/land_redevelopment_dashboard/ownership>
- ArcGIS Map Viewer: <https://urap.maps.arcgis.com/apps/mapviewer/index.html?webmap=19022018e35b4b72a2d30cba2d56c8e2>
- Repository: <https://github.com/rutomo-ura/land_redevelopment_dashboard>

## What This Project Shows

The web app presents a citywide parcel map with a right-side analysis panel. Parcels are grouped by prior-year delinquency band and property-use group so users can move from a broad pattern view into individual parcel review.

The current public map includes:

- 30,259 mapped vacant parcels in the public multi-use bundle.
- 20,663 parcels in the default residential view.
- 3,667 parcels in the `11+ prior years` band.
- 1,561 commercial parcels available through the property-use filter.
- Filters for `No known prior years`, `1-4`, `5-10`, and `11+` prior-year groups.
- Filters for residential, commercial, industrial, public/institutional, infrastructure/utility, and review property-use groups.
- Bookmarks for citywide review, Homewood, Hill District, Perry South, and Larimer.
- Context charts for City neighborhoods, Council districts, and ZIP vacancy penetration.

## Current Area Signals

The strongest ZIP-level vacancy penetration signals in this extract are `15219` and `15208`, where more than one-third of residential assessment parcels are vacant-like under the current filter.

The strongest City-neighborhood parcel concentrations in the current enriched layer include Hazelwood, Perry South, Homewood North, Lincoln-Lemington-Belmar, Middle Hill, Homewood South, and Larimer. Council districts D9 and D6 show the largest mapped parcel counts.

## How To Read The Map

The map is an exploratory planning tool, not a final decision system. It is designed to help people ask better follow-up questions:

- Which clusters should be reviewed parcel by parcel?
- Which vacant parcels have long delinquency histories?
- Which areas show both high concentration and visible redevelopment context?
- Where might the data need cleanup before a policy, acquisition, or investment decision?

The public web bundle omits owner names and internal database connection details. Internal analyst workflows can use the reproducible scripts and SQL in this repository when a more detailed review is appropriate.

## Data And Method Notes

The public layer is a sanitized multi-use extract from the internal vacant land inventory. It omits owner names and includes a derived `use_group` field based on county assessment `usedesc` values. Residential remains the default app view so the current ZIP and neighborhood charts remain comparable to the first analysis.

City neighborhood and Council district assignments are derived from authoritative City boundary layers using parcel geometry centroids. ZIP penetration uses residential assessment parcels as the denominator and remains a rate-based comparison view.

Public ownership is checked against the Ownership Overview reference layer before refreshes are published. The weekly refresh workflow exports from PostGIS, rebuilds the public GeoJSON, updates ownership acreage and parcel counts from the reference layer, and stops if ownership counts, parcel IDs, or geometries fail QA.

## Repository Guide

- `docs/` contains the GitHub Pages app and project documentation.
- `docs/complete-dashboard-prd.md` defines the longer-term product vision for the redevelopment decision-support dashboard.
- `docs/supervisor-feedback-roadmap.md` summarizes review feedback and future improvement priorities.
- `docs/latest_ownership_qa.md` records the latest ownership refresh validation result.
- `docs/arcgis_quickstart_tutorial.md` preserves the analyst tutorial and original ArcGIS/SQL walkthrough.
- `webmap/` contains the source copy of the static ArcGIS Maps SDK app.
- `reports/` contains the rendered area-analysis report and chart assets.
- `scripts/` contains read-only export, rendering, and ArcGIS helper scripts.
- `sql/` contains the documented read-only SQL analysis.
- `templates/` contains ArcGIS popup text and related reusable snippets.

## Responsible Use

This map should support exploration, coordination, and prioritization. It should not be used by itself to determine ownership strategy, legal status, redevelopment eligibility, acquisition priority, or community impact. Those decisions require source-data review, field/context checks, and policy judgment.
