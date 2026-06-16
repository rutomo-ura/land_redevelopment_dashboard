# Supervisor Review Context And Improvement Roadmap

## Purpose

This note translates supervisor review feedback into a public roadmap for the vacant land triage web app. The first version demonstrated that a custom ArcGIS-style web app can pair parcel mapping with analysis filters, charts, and a clearer redevelopment use case than a template map alone.

The next version should move from a residential-focused exploration tool toward broader acquisition and redevelopment decision support. That means keeping the map useful for quick pattern recognition while adding stronger data context around permissible use, tax delinquency, geography, ownership, and visual verification.

## What V1 Demonstrated

- A custom web app can remove some constraints of template ArcGIS apps while still preserving a familiar map-reading experience.
- A right-side analysis panel gives users a faster way to connect parcel locations with summary patterns.
- Native charts and map cross-filtering help users move from citywide patterns to specific areas.
- The current framing connects vacant parcels to real planning and acquisition questions instead of only displaying points on a map.
- Publishing through GitHub Pages makes the project easier to share, review, and iterate.

## Improvement Themes

### Broaden Property Use Exploration

The current public app is residential-focused. Future versions should keep residential, commercial, and other relevant vacant property types in the dataset, then let users filter by type inside the app.

For early exploration, the county assessment `usedesc` field is acceptable as a practical classification source. For operational use, zoning should be incorporated because it is the authoritative source for permissible uses.

### Refine Tax Delinquency Logic

Tax delinquency matters because it can connect to potential site-control paths such as City Treasury Sales or Sheriff Sales. The app should distinguish between planning context and current acquisition relevance.

Future acquisition-oriented views should prioritize parcels that are at least three years delinquent. Parcels with one or two years of delinquency can remain visible as a planning watchlist, while parcels confirmed as not currently tax delinquent should be excluded or hidden by default when the focus is acquisition opportunity.

### Use More Relevant Public Boundaries

ZIP cross-filtering is useful for a technical first version, but many planning users think more naturally in neighborhoods and Council districts. Future versions should add authoritative City neighborhood and Council district boundaries from the City's open GIS data.

A spatial join to authoritative boundaries should assign neighborhood and Council district values to nearly every parcel, rather than relying only on records that already carry a neighborhood label from another system.

### Differentiate Ownership And Control

The app should more clearly distinguish private property from City-owned, URA-owned, and other public or authority-owned property. This matters because tax delinquency is most useful for identifying potential acquisition opportunities among private parcels, while City or URA parcels may already be controllable through different processes.

A later operational version should also separate public parcels that may be available for development from parcels that should likely remain in public ownership, such as parks, greenways, or properties already committed to another use.

### Add Aerial Imagery Verification

Vacancy status often benefits from visual review. Future versions should include an aerial imagery or basemap toggle so users can quickly check whether a parcel appears vacant before deeper review.

The existing City tax delinquency map is a useful reference because it lets users turn layers on and off, including aerial context and vacant land points. A future custom app should bring that layering flexibility together with stronger filters and analysis controls.

## Phased Roadmap

### Phase 1: Expand Property Type Filtering

- Retain residential, commercial, and other relevant vacant parcels in the export.
- Add a clear property type or use group field derived from assessment use descriptions.
- Replace residential-only framing with an in-app use filter.
- Keep residential as an easy default view if that remains the primary analysis need.

### Phase 2: Strengthen Acquisition Logic

- Add delinquency categories that separate non-delinquent parcels, one to two year watchlist parcels, and three-plus year acquisition candidates.
- Default acquisition-focused views to currently delinquent parcels, with emphasis on the three-plus year threshold.
- Preserve one to two year delinquent parcels for planning and future monitoring.
- Document that delinquency is a triage signal, not a final legal or acquisition determination.

### Phase 3: Add Neighborhood And Council District Analysis

- Source authoritative City neighborhood and Council district boundaries.
- Spatially join parcels to those boundaries during the export or enrichment step.
- Add neighborhood and Council district charts alongside or in place of ZIP analysis.
- Extend chart-to-map cross-filtering so users can select a neighborhood, Council district, or ZIP and see the corresponding boundary on the map.

### Phase 4: Classify Ownership And Control

- Add an ownership or control group field with categories such as private, City-owned, URA-owned, other public or authority-owned, and unknown.
- Add filters and legend treatment that make ownership groups visible without overwhelming the delinquency view.
- Treat private delinquent parcels and public controllable parcels as related but distinct opportunity types.
- Identify a later data source or review process for public parcels that are development-available versus parks, greenways, committed sites, or other non-development public assets.
- Consider using ownership and control as the root frame for future modules, with vacant land, acquisition readiness, public property control, assemblage potential, and redevelopment context treated as connected views rather than separate one-off maps.

Related URA sidebar apps suggest a useful direction for the next version:

- [Ownership Overview](https://urap.maps.arcgis.com/apps/instant/sidebar/index.html?appid=ec07466480c6491185acc2c514901446)
- [URA, City, PLB, HACP Properties](https://urap.maps.arcgis.com/apps/instant/sidebar/index.html?appid=c6b65e8fdd67439fb52224252b07cca0)

The Ownership Overview app centers City, URA, and PLB owned parcels while making context layers available for neighborhoods, Council districts, zoning, URA projects, incentive geographies, address search, parcel search, and 2025 county imagery. The URA, City, PLB, HACP Properties app expands this into a broader public-property frame with HACP properties, three-plus year City tax delinquency, USPS vacancy, condemned properties, proposed open space, parks, steep slopes, and a Potential Assemblages layer.

For the custom dashboard, those references imply that ownership should not be only another filter. It can become the organizing layer for the app: users should be able to ask what is vacant, who can control it, what acquisition path may apply, whether it sits near existing public holdings, and whether surrounding conditions make it suitable for redevelopment.

Candidate public-safe data features:

- `ownership_group`: Private, City, URA, PLB, HACP, other public, institutional or nonprofit, unknown.
- `control_path`: Existing public control, potential public transfer, tax-sale candidate, watchlist, no clear path.
- `acquisition_priority`: Three-plus year delinquent, one to two year watchlist, public controllable, context only.
- `development_availability`: Available or likely review needed, committed, park or open space, infrastructure or slope constraint, unknown.
- `assemblage_id` and `assemblage_type`: derived grouping for adjacent or nearby parcels that may support coordinated review.
- `public_context_flags`: zoning, Council district, neighborhood, open space, parks, steep slope, vacancy, condemnation, and imagery-review fields.

Potential dashboard modules:

- Ownership and control overview.
- Vacant land opportunity explorer.
- Public property inventory.
- Potential assemblages.
- Acquisition readiness.
- Redevelopment constraints and context.

### Phase 5: Add Imagery And Layer Controls

- Add an aerial imagery basemap toggle or imagery layer switch.
- Keep the current map style available for pattern reading.
- Consider optional overlays for vacant land points, tax delinquency, neighborhoods, Council districts, and ownership categories.
- Use the existing City tax delinquency map as a reference for practical layer controls while keeping the custom app's stronger filtering experience.

## Backlog

- Update the export workflow so the public app can include multiple property-use groups.
- Add a documented `use_group` or similar public-safe field.
- Add a documented delinquency status field aligned to planning watchlist and acquisition candidate logic.
- Add authoritative spatial joins for City neighborhoods and Council districts.
- Add charts and cross-filtering for neighborhood and Council district boundaries.
- Add ownership or control classification.
- Explore whether ownership-control views should become the dashboard root, with vacant-land analysis as one connected module.
- Add an aerial imagery toggle.
- Document operational limitations around zoning, ownership, delinquency, and development availability.

## Acceptance Criteria For A Future Version

- Users can filter vacant parcels by residential, commercial, and other relevant property-use groups.
- Acquisition-focused views emphasize private parcels that are at least three years delinquent.
- One to two year delinquent parcels remain available as a planning watchlist.
- Non-delinquent parcels are hidden or excluded by default in acquisition-focused views.
- Nearly every parcel receives neighborhood and Council district values from authoritative City boundaries.
- Neighborhood and Council district charts can cross-filter the map and display the selected boundary.
- Public, URA, City, private, and unknown ownership groups are visible and filterable.
- Users can toggle aerial imagery to visually review parcel vacancy context.

## References

- Live GitHub Pages app: <https://rutomo-ura.github.io/vacant-land-triage-map/>
- ArcGIS Map Viewer: <https://urap.maps.arcgis.com/apps/mapviewer/index.html?webmap=19022018e35b4b72a2d30cba2d56c8e2>
- City tax delinquency map reference: <https://urap.maps.arcgis.com/apps/instant/interactivelegend/index.html?appid=8e8964cd0d6649c796742003e1d84a1c>
- Ownership overview reference: <https://urap.maps.arcgis.com/apps/instant/sidebar/index.html?appid=ec07466480c6491185acc2c514901446>
- URA, City, PLB, HACP properties reference: <https://urap.maps.arcgis.com/apps/instant/sidebar/index.html?appid=c6b65e8fdd67439fb52224252b07cca0>
