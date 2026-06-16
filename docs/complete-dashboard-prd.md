# Land Redevelopment Decision Support Dashboard PRD

## 1. Product Vision

The Land Redevelopment Decision Support Dashboard should help URA staff and public-facing partners move from scattered parcel layers toward a clearer redevelopment decision surface. The dashboard should answer a practical sequence of questions:

- What land appears vacant or underutilized?
- Who controls it or may be able to control it?
- What acquisition, transfer, or redevelopment path may be realistic?
- Which geographies, public assets, constraints, and market or community context should shape next review?
- Which parcels or assemblages deserve follow-up outside the dashboard?

The current public app proves that a custom ArcGIS-style web app can pair parcel mapping with sidebar analysis, native charts, and cross-filtering. The complete vision is a modular dashboard where ownership/control, vacant land, acquisition readiness, public property, assemblage opportunities, and redevelopment constraints work together in one coherent product.

## 2. Product Positioning

Working title: **Land Redevelopment Decision Support Dashboard**

Public title option: **Vacant Land Redevelopment Explorer**

Internal title option: **Land Control And Redevelopment Dashboard**

The product should not present itself as a final eligibility or acquisition system. It should be positioned as a planning, screening, and coordination tool that helps analysts identify where deeper source review, policy judgment, field verification, legal review, and community context are needed.

## 3. Audiences

Primary users:

- URA planning, real estate, and data staff evaluating redevelopment opportunities.
- Analysts preparing parcel-level or area-level review for internal conversations.
- Staff comparing vacant parcels against public ownership, tax delinquency, zoning, geography, and visible site context.

Secondary users:

- City partners coordinating public property, tax delinquency, public land, and district-level planning.
- Neighborhood or corridor planning partners reviewing public-safe patterns.
- Supervisors reviewing analytical direction, product quality, and readiness for operational use.

Public users:

- External reviewers who need a sanitized view of broad vacant land patterns without owner names, internal statuses, or sensitive operational fields.

## 4. Core Product Principles

- **Map first, analysis beside it.** The map remains the main canvas; the sidebar explains what is selected and why it matters.
- **Ownership is foundational.** Vacant land matters differently depending on whether it is private, City-owned, URA-owned, PLB-owned, HACP-owned, or otherwise public.
- **Acquisition logic is explicit.** Tax delinquency, public control, transfer candidates, and watchlist status should be separate signals, not collapsed into one score.
- **Geographies should match how staff think.** Neighborhoods and Council districts should be first-class filters, with ZIP retained as a secondary analytical lens.
- **Charts must be native and interactive.** Chart rows should filter the map and draw selected boundaries rather than acting as static images.
- **Public and internal modes must differ.** Owner names, internal project status, and operational notes should be excluded from the public bundle unless approved.
- **Every signal needs a caveat.** The app supports screening, not final legal, ownership, zoning, or acquisition decisions.

## 5. Current Baseline

The current GitHub Pages app includes:

- ArcGIS Maps SDK web app with a URA-themed header and right-side analysis panel.
- Sanitized multi-use parcel GeoJSON.
- Residential default view with optional commercial, industrial, public/institutional, infrastructure/utility, and review categories.
- Prior-year delinquency bands.
- Native charts for City neighborhoods, Council districts, ZIP vacancy penetration, and median prior years by ZIP.
- Chart-to-map cross-filtering for ZIP, neighborhood, and Council district boundaries.
- Parcel popups docked in the lower-left map position.
- ArcGIS Map Viewer link and public README.

Live references:

- GitHub Pages app: <https://rutomo-ura.github.io/land_redevelopment_dashboard/>
- ArcGIS Map Viewer: <https://urap.maps.arcgis.com/apps/mapviewer/index.html?webmap=19022018e35b4b72a2d30cba2d56c8e2>
- City tax delinquency map: <https://urap.maps.arcgis.com/apps/instant/interactivelegend/index.html?appid=8e8964cd0d6649c796742003e1d84a1c>
- Ownership Overview: <https://urap.maps.arcgis.com/apps/instant/sidebar/index.html?appid=ec07466480c6491185acc2c514901446>
- URA, City, PLB, HACP Properties: <https://urap.maps.arcgis.com/apps/instant/sidebar/index.html?appid=c6b65e8fdd67439fb52224252b07cca0>

## 6. Problem Statement

Vacant land review currently requires users to combine multiple map layers, database extracts, public ownership references, tax delinquency context, parcel details, and local geography. Template ArcGIS apps are useful for layer display, but they can make analytical workflows feel like manual overlay stacking.

Users need a more directed dashboard that preserves the familiar ArcGIS map experience while adding opinionated analysis controls:

- Filter by use, delinquency, geography, ownership, and acquisition readiness.
- Compare areas using native charts.
- Select a chart row and immediately see the relevant boundary and filtered parcels.
- Distinguish public land already in some form of control from private land that may require acquisition.
- Identify potential assemblages rather than only individual parcels.
- Use imagery and constraint layers to flag parcels that need visual or technical review.

## 7. Goals

Product goals:

- Create a central map dashboard for parcel-level redevelopment screening.
- Organize the app around ownership/control, vacancy, acquisition readiness, and redevelopment context.
- Support both citywide pattern recognition and parcel-level follow-up.
- Provide a public-safe version that can be shared externally.
- Create a clear internal path for richer ownership, project, and acquisition data when approved.

Analytical goals:

- Reduce the time needed to identify promising follow-up areas.
- Make geographic concentration visible by neighborhood, Council district, and ZIP.
- Separate property-use type, tax delinquency, ownership, and availability signals.
- Surface potential assemblages from adjacent or nearby parcels.
- Preserve caveats and source transparency so the dashboard does not overstate certainty.

Technical goals:

- Keep the public app deployable through GitHub Pages.
- Keep data exports reproducible through scripts.
- Use ArcGIS Maps SDK and authoritative GIS services where appropriate.
- Keep owner names and internal fields out of public data bundles.
- Allow future migration to a more operational internal deployment if data sensitivity or authentication requires it.

## 8. Non-Goals

- Replace legal ownership research.
- Replace zoning interpretation or development feasibility review.
- Automate acquisition decisions.
- Publish sensitive owner, project, or operational data publicly.
- Guarantee that every parcel marked vacant is physically vacant.
- Serve as a final public commitment that a parcel is available for redevelopment.

## 9. Product Modes

### Public Mode

Public mode should support external sharing and broad transparency.

Allowed:

- Sanitized parcel geometry.
- Parcel PIN or public-safe identifier if approved.
- Use group.
- Prior-year band.
- City neighborhood, Council district, ZIP.
- Public-safe context flags.
- Aggregated charts and counts.
- Public links to ArcGIS maps and references.

Excluded unless explicitly approved:

- Owner names.
- Internal project notes.
- Staff comments.
- Acquisition strategy notes.
- Detailed delinquency account information.
- Fields that imply a final public redevelopment decision.

### Internal Mode

Internal mode can support staff workflows if hosted with appropriate access control.

Potential internal fields:

- Owner name and owner bucket.
- Public agency owner.
- Current internal status.
- Project assignment.
- Site-control path.
- Tax sale or treasury sale readiness signal.
- Availability review notes.
- Field verification status.
- Staff comments and review history.

## 10. Information Architecture

Recommended top-level app structure:

- **Overview:** summary KPIs, current filters, map, and primary legend.
- **Vacant Land:** parcel inventory by use group, delinquency band, and geography.
- **Ownership And Control:** private, City, URA, PLB, HACP, and other public ownership patterns.
- **Acquisition Readiness:** tax delinquency thresholds, watchlist parcels, and private acquisition candidates.
- **Public Property:** controllable public parcels, availability review, committed/protected assets.
- **Assemblages:** potential grouped opportunities from adjacent or nearby parcels.
- **Constraints And Context:** zoning, slopes, parks/open space, imagery, vacancy verification, projects, and incentive geographies.

The first screen should still be the map and sidebar, not a landing page. Navigation can be implemented as compact tabs or segmented controls within the sidebar/header.

## 11. Core User Stories

- As an analyst, I want to filter vacant parcels by property-use group so I can compare residential, commercial, industrial, public, and review categories.
- As an analyst, I want to select a neighborhood, Council district, or ZIP chart row so the map draws the boundary and filters parcels to that area.
- As a real estate reviewer, I want to distinguish private delinquent parcels from public parcels that may already be controllable.
- As a planning user, I want to see which public properties are near vacant private parcels so I can identify assemblage or coordination opportunities.
- As a supervisor, I want the app to make its assumptions visible so I can understand whether a metric is exploratory, operational, or public-safe.
- As a public viewer, I want a readable map with clear filters, legends, and contextual charts without seeing sensitive internal data.
- As an internal user, I want to toggle imagery and constraints so I can quickly flag parcels that need visual or technical verification.

## 12. Functional Requirements

### Map

- Display parcel polygons with a default citywide view.
- Support a residential default view while allowing other use groups to be enabled.
- Render selected ZIP, neighborhood, and Council district boundaries.
- Support parcel popups docked in a stable lower-left position.
- Include search for addresses and parcels where supported.
- Provide basemap toggle between readable topographic/vector style and aerial imagery.
- Provide a clear legend for prior-year band, ownership group, and selected overlays.

### Sidebar Analysis

- Provide compact KPI cards for selected parcel count, acreage, three-plus year delinquency candidates, public/control candidates, and active geography.
- Include native charts for neighborhood concentration, Council district concentration, ZIP vacancy penetration, median prior years, ownership mix, and acquisition readiness.
- Make chart rows clickable and reversible.
- Show selected-area context after a chart click.
- Keep the sidebar dense and scannable.

### Filters

Required filters:

- Use group.
- Prior-year or delinquency category.
- Geography: neighborhood, Council district, ZIP.
- Ownership group.
- Control path.
- Acquisition priority.
- Development availability.
- Imagery or verification status.

Filter behavior:

- Filters should update map parcels and KPI counts.
- Chart clicks should cross-filter the map and highlight selected boundaries.
- Reset should return to the approved default view.
- Active filters should be visually obvious.

### Ownership And Control

- Add `ownership_group`.
- Add `control_path`.
- Separate public-control opportunities from private acquisition candidates.
- Allow URA, City, PLB, HACP, other public, private, institutional/nonprofit, and unknown grouping.
- Public mode should suppress owner names while preserving owner group.

### Acquisition Readiness

- Add delinquency categories:
  - Non-delinquent or no current delinquency signal.
  - One to two year watchlist.
  - Three-plus year acquisition candidate.
  - Unknown or needs review.
- Acquisition-focused views should emphasize private parcels with three-plus year delinquency.
- Public or already controllable parcels should be visible as a separate opportunity type.
- The app should label delinquency as a screening signal, not a legal determination.

### Assemblages

- Add derived `assemblage_id`.
- Add `assemblage_type`.
- Show parcel count, acreage, owner group mix, public parcel count, private delinquent count, and vacancy share.
- Identify adjacency or proximity logic used to group parcels.
- Allow a user to select an assemblage and see contributing parcels.
- Keep assemblage logic auditable and reproducible.

### Context And Constraints

Potential overlays:

- City neighborhoods.
- Council districts.
- ZIP boundaries.
- Zoning.
- Parks.
- Proposed open space.
- Steep slopes.
- URA projects.
- Public school locations.
- Incentive geographies.
- USPS vacancy.
- Condemned properties.
- County imagery.

The dashboard should not require all overlays to be visible at once. Context layers should be toggleable and grouped by purpose.

## 13. Data Model

Core parcel fields:

- `parcel_id`
- `par_pin`
- `geometry`
- `acreage`
- `usedesc`
- `use_group`
- `prior_years`
- `prior_band`
- `tax_status`
- `city_neighborhood`
- `council_district`
- `council_district_label`
- `zip`

Future fields:

- `ownership_group`
- `owner_bucket`
- `public_agency`
- `control_path`
- `acquisition_priority`
- `development_availability`
- `assemblage_id`
- `assemblage_type`
- `imagery_review_status`
- `vacancy_signal_source`
- `constraint_flags`
- `public_context_flags`
- `last_refreshed`
- `source_confidence`

Derived summary files:

- `boundary_analysis.json`
- `ownership_analysis.json`
- `acquisition_readiness_analysis.json`
- `assemblage_analysis.json`
- `context_layer_manifest.json`

## 14. Data Sources

Current and candidate sources:

- Internal vacant land inventory export.
- Allegheny County assessment fields.
- Authoritative City neighborhood boundaries.
- City Council Districts 2022.
- ZIP/ZCTA boundaries.
- City/URA/PLB/HACP owned property layers.
- City tax delinquency layers.
- USPS vacancy points.
- Condemned property layers.
- Parks and proposed open space layers.
- Steep slope layers.
- Zoning layers.
- County imagery.
- URA project layers.

Source precedence should be documented for ownership, geography, zoning, delinquency, and vacancy status.

## 15. Metrics And Charts

Hero metrics:

- Total parcels in current filter.
- Total acreage in current filter.
- Three-plus year private delinquency candidates.
- Public or controllable parcels.
- Potential assemblage count.
- Selected geography name and parcel count.

Core charts:

- Parcel concentration by City neighborhood.
- Parcel concentration by Council district.
- ZIP vacancy penetration.
- Median prior years by ZIP.
- Ownership mix by selected geography.
- Acquisition readiness by selected geography.
- Potential assemblages by acreage or parcel count.
- Use group mix.

Metric definitions:

- Parcel concentration: count of mapped parcels matching active filters in the geography.
- ZIP vacancy penetration: residential vacant-like parcels divided by residential assessment parcel denominator.
- Median prior years: median prior-year delinquency value among mapped parcels in the geography.
- Acquisition candidate: private parcel with three-plus year delinquency signal, subject to source review.
- Public controllable candidate: public or authority-owned parcel that may be controllable, subject to availability and policy review.
- Assemblage: adjacent or nearby parcel group meeting size, ownership, or opportunity rules defined in the export pipeline.

## 16. Interaction Requirements

- Clicking a chart row selects the area, draws its boundary, filters parcels spatially, and updates the selected-area card.
- Clicking the same active chart row clears the selection.
- Switching filters updates the map and summary counts without losing the selected geography unless the selected geography becomes invalid.
- Selecting an assemblage zooms to the assemblage and highlights contributing parcels.
- Toggling imagery should preserve current map extent and filters.
- Parcel popup should show only fields allowed in the current mode.
- Active filter and selection state should be visible in the sidebar.

## 17. Visual And UX Requirements

- Use a proper URA-style blue app header with compact logo treatment.
- Keep the logo secondary to the app title and controls.
- Preserve an ArcGIS-style map reading experience.
- Use a dense, professional sidebar rather than a marketing layout.
- Use native charts instead of embedded chart images.
- Keep legends clear and close to the map.
- Avoid oversized title cards on the map.
- Avoid plain text links for primary actions; use button-style actions for ArcGIS, GitHub, data notes, and roadmap.
- Keep mobile usable, but optimize primarily for desktop analysis.

## 18. Technical Architecture

Current architecture:

- Static GitHub Pages app in `docs/`.
- ArcGIS Maps SDK for JavaScript.
- Sanitized GeoJSON parcel layer.
- ArcGIS FeatureLayer services for selected boundaries.
- Native JavaScript sidebar charts.
- Reproducible Python enrichment scripts.

Recommended next architecture:

- Keep public GitHub Pages deployment for public-safe app.
- Keep public data extracts small enough for browser performance.
- Split public and internal data bundles if internal mode is introduced.
- Add generated analysis JSON files for ownership, acquisition readiness, and assemblages.
- Add a context layer manifest to manage optional overlays.
- Consider an authenticated internal deployment if sensitive fields are required.

## 19. Data Pipeline Requirements

Pipeline steps:

- Export parcel candidates from source data.
- Sanitize public fields.
- Derive `use_group`.
- Derive delinquency category and acquisition priority.
- Spatially join City neighborhood, Council district, and ZIP.
- Join ownership/control classifications.
- Join or flag public-property, tax delinquency, vacancy, condemned, parks/open space, slope, zoning, and imagery context.
- Build assemblage groups.
- Generate dashboard-ready JSON summaries.
- Copy public-safe assets into `docs/`.

Pipeline quality checks:

- Feature count reconciliation.
- Geometry validity.
- Missing geography rates.
- Unknown ownership rates.
- Public/private classification review.
- Public-safe field audit.
- Chart summary reconciliation against parcel layer.

## 20. Permissions And Governance

Public release requirements:

- No owner names unless approved.
- No internal notes or project-sensitive statuses.
- No claims of final acquisition eligibility.
- Clear source and caveat notes.
- README and documentation should read as public project material.

Internal release requirements:

- Access control for sensitive fields.
- Clear field provenance.
- Audit trail for refresh dates.
- Review process for adding operational fields.
- Separate public and internal data build targets.

## 21. Success Measures

Product success:

- Staff can identify priority review areas faster than using separate map layers.
- Supervisors can understand the analytical logic without needing a code walkthrough.
- Users can move from a chart insight to a map selection in one click.
- Public version remains understandable and responsible.

Data success:

- Most parcels receive authoritative neighborhood and Council district values.
- Ownership/control unknown rate decreases over time.
- Acquisition readiness categories reconcile with tax delinquency source logic.
- Public bundle passes sensitive-field review.

Technical success:

- GitHub Pages app loads reliably.
- Native charts render without image dependencies.
- Data refresh can be reproduced from documented scripts.
- Map interaction remains performant with the public parcel bundle.

## 22. Milestones

### Milestone 1: Current Public Explorer Stabilization

- Preserve current map, filters, charts, and README.
- Keep public bundle sanitized.
- Improve documentation and caveats.

### Milestone 2: Acquisition Readiness

- Implement delinquency categories.
- Add three-plus year acquisition candidate logic.
- Add one to two year watchlist logic.
- Add acquisition readiness chart and filter.

### Milestone 3: Ownership And Control

- Add ownership/control classification.
- Add ownership mix chart.
- Add public/private/control-path filters.
- Separate public controllable parcels from private tax-delinquent parcels.

### Milestone 4: Assemblage Opportunities

- Add assemblage generation.
- Add assemblage layer, chart, and popup.
- Show parcel contribution and ownership mix.

### Milestone 5: Context And Verification

- Add imagery and context layer toggles.
- Add parks, open space, slopes, zoning, vacancy, and condemned-property flags.
- Add source confidence and review status fields.

### Milestone 6: Internal Operational Mode

- Define sensitive fields and access requirements.
- Separate internal and public builds.
- Add internal-only review fields if approved.

## 23. Acceptance Criteria

- Users can open the dashboard and immediately understand parcel distribution, active filters, and map legend.
- Users can filter by use group, delinquency category, ownership group, geography, and acquisition readiness.
- Users can click neighborhood, Council district, ZIP, ownership, and acquisition charts to update the map.
- Users can toggle imagery without losing context.
- Users can identify public-control opportunities separately from private acquisition candidates.
- Users can inspect potential assemblages and see contributing summary metrics.
- Public mode excludes sensitive fields.
- Documentation explains source logic, caveats, and refresh process.
- Chart counts reconcile with the filtered parcel layer.
- Data refresh scripts produce the map layer and analysis summaries reproducibly.

## 24. Open Questions

- Which ownership source should control when sources disagree?
- What exact owner-group taxonomy should be used for public release?
- What thresholds define a potential assemblage?
- Which public parcels should be excluded as parks, greenways, infrastructure, or committed sites?
- Should internal mode remain in ArcGIS Online, move to an authenticated custom app, or use both?
- What cadence should data refresh follow?
- Which fields require legal, policy, or supervisor review before publication?

## 25. Risks

- Public users may over-interpret screening signals as final decisions.
- Ownership and tax delinquency data may become stale.
- Assemblage logic may imply opportunity where site constraints or ownership status make redevelopment unrealistic.
- Public data sanitization mistakes could expose sensitive fields.
- Too many overlays could make the app harder to use.
- Browser performance may degrade if the public GeoJSON grows too large.

## 26. Recommended Next Build Step

The next implementation step should be **Acquisition Readiness** or **Ownership And Control**, depending on source readiness.

Recommended order:

1. Add ownership/control classification because it creates the dashboard's long-term organizing frame.
2. Add acquisition readiness logic using the three-plus year delinquency threshold.
3. Add ownership and acquisition charts with chart-to-map cross-filtering.
4. Add assemblage logic once ownership/control and delinquency signals are reliable.

This keeps the app moving from exploratory vacant-land review toward practical redevelopment decision support without over-claiming operational certainty.
