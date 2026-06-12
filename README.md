# Vacant Land Redevelopment Triage Map

An interactive public map for exploring residential-focused vacant land patterns in Pittsburgh.

This project helps planners, analysts, and neighborhood partners see where vacant parcels are clustered, where long delinquency histories may warrant closer review, and which areas may need a more detailed redevelopment, acquisition, maintenance, or data-quality conversation.

## Explore The Map

- Live web app: <https://rutomo-ura.github.io/vacant-land-triage-map/>
- ArcGIS Map Viewer: <https://urap.maps.arcgis.com/apps/mapviewer/index.html?webmap=19022018e35b4b72a2d30cba2d56c8e2>
- Repository: <https://github.com/rutomo-ura/vacant-land-triage-map>

## What This Project Shows

The web app presents a citywide parcel map with a right-side analysis panel. Parcels are grouped by prior-year delinquency band so users can move from a broad pattern view into individual parcel review.

The current public map includes:

- 20,488 residential-focused vacant parcels.
- 3,590 parcels in the `11+ prior years` band.
- Filters for `No known prior years`, `1-4`, `5-10`, and `11+` prior-year groups.
- Bookmarks for citywide review, Homewood, Hill District, Perry South, and Larimer.
- Context charts for ZIP vacancy penetration and named-neighborhood concentration.

## Current Area Signals

The strongest ZIP-level vacancy penetration signals in this extract are `15219` and `15208`, where more than one-third of residential assessment parcels are vacant-like under the current filter.

The strongest named-neighborhood concentration signals include Perry South, Larimer, Hazelwood, Homewood North, Middle Hill, and Homewood South. These are best treated as places to zoom in for parcel-level review rather than final neighborhood vacancy rates.

## How To Read The Map

The map is a triage tool, not a final decision system. It is designed to help people ask better follow-up questions:

- Which clusters should be reviewed parcel by parcel?
- Which vacant parcels have long delinquency histories?
- Which areas show both high concentration and visible redevelopment context?
- Where might the data need cleanup before a policy, acquisition, or investment decision?

The public web bundle omits owner names and internal database connection details. Internal analyst workflows can use the reproducible scripts and SQL in this repository when a more detailed review is appropriate.

## Data And Method Notes

The public layer is a residential-focused extract from the internal vacant land inventory. It filters out obvious non-residential and infrastructure-like land uses such as roads, rail, utilities, public-service land, industrial parcels, commercial parcels, and large anomaly polygons.

ZIP penetration uses residential assessment parcels as the denominator. Named-neighborhood concentration is useful for identifying clusters, but it should not be described as a complete neighborhood-wide vacancy rate unless a complete neighborhood denominator is added.

## Repository Guide

- `docs/` contains the GitHub Pages app and project documentation.
- `docs/arcgis_quickstart_tutorial.md` preserves the analyst tutorial and original ArcGIS/SQL walkthrough.
- `webmap/` contains the source copy of the static ArcGIS Maps SDK app.
- `reports/` contains the rendered area-analysis report and chart assets.
- `scripts/` contains read-only export, rendering, and ArcGIS helper scripts.
- `sql/` contains the documented read-only SQL analysis.
- `templates/` contains ArcGIS popup text and related reusable snippets.

## Responsible Use

This map should support exploration, coordination, and prioritization. It should not be used by itself to determine ownership strategy, legal status, redevelopment eligibility, acquisition priority, or community impact. Those decisions require source-data review, field/context checks, and policy judgment.
