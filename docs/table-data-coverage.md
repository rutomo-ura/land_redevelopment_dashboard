# Vacant Land Table Data Coverage

## Answer

The table is now comprehensive for the fields in the current dashboard parcel bundle: one row per parcel PIN, 29,783 unique rows, 61 joined fields, and no duplicate or missing parcel IDs or geometries. The column picker and XLSX export expose every nonredundant bundle field; only three implementation flags (`is_vacant`, `is_condemned`, and the duplicate `condemned_status`) remain outside the picker because their labeled equivalents are already present.

It is not a complete copy of every raw source column. The build intentionally selects decision-useful fields, excludes infrastructure/right-of-way parcels, omits database connection details, and converts unreconciled delinquency dollar totals into bands.

## Joined Source Coverage

| Source | Parcel grain used | Dashboard matches | Coverage of 29,783 parcels | Table contribution | Source snapshot |
| --- | --- | ---: | ---: | --- | --- |
| `gis.calculated_vacant_land` / assessment export | One vacant-land parcel per `par_pin` | 29,783 | 100.0% | PIN, owner, use, tax description/prior years, acreage, fair market value | Current rebuilt bundle, July 16, 2026 |
| `gis.city_tax_delinquent_3yr` PostgreSQL extract | One delinquent parcel per PIN | 5,322 | 17.9% | Canonical 3+ year flag, canonical prior years, owed band, tax address and ward, source label | June 17, 2026 |
| Tolemi BuildingBlocks export | One parcel per normalized PIN | 5,292 | 17.8% | Tax status, USPS vacancy, code-violation date, condemnation context, structure and vacant-lot scores | June 17, 2026 |
| `gis.epp_parcels_full` | One EPP parcel per PIN | 14,763 | 49.6% | Project, inventory/status/class, EPP geography, zoning, tags, maintenance manager, publication and modification fields | Refreshed from PostgreSQL July 16, 2026 |
| WPRDC Condemned and Dead-End Properties | Potentially multiple records per PIN; highest hazard record retained | 533 | 1.8% | PLI score/band, inspection result/status, record, created date, ward | July 9, 2026 cache |
| WPRDC City neighborhoods and 2022 Council districts | Centroid spatial join | 29,599 / 29,606 | 99.4% | Authoritative dashboard neighborhood and Council district | Refreshed July 16, 2026 |

## Quality Findings

- Parcel grain is stable: 29,783 rows and 29,783 distinct normalized PINs.
- Ownership QA passes with zero summary mismatches, duplicate IDs, missing IDs, or missing geometries.
- PostgreSQL is the canonical source for the 3+ year delinquency flag. Tolemi is retained for complementary screening context.
- PostgreSQL and Tolemi dollar totals differ materially in the June 17 reconciliation. The dashboard therefore publishes an owed-value band from PostgreSQL instead of either raw total.
- PLI records can repeat by PIN. The build retains the record with the highest normalized inspection hazard score, preventing a one-to-many join from duplicating parcel rows.
- Source coverage is explicit in the `Joined sources` column so users can distinguish an actual negative value from a source that did not match.

## Intentional Limits

- The dashboard excludes 476 infrastructure, rail, utility, air-rights, and right-of-way polygons from the working parcel universe.
- Detailed delinquency balances, penalties, interest, billing-city data, and raw Tolemi owner data are not added to the GitHub Pages bundle.
- The current build includes owner names and EPP workflow attributes for staff review. GitHub Pages does not provide authentication, so this deployment must not be treated as confidential.
- Prior years and tax owed bands are screening signals, not final tax-sale or acquisition eligibility.
- EPP zoning is a source attribute, not a determination of permissible use or redevelopment feasibility.
- City neighborhood and Council assignment is centroid-based; edge parcels may require manual review.

## Remaining High-Value Gaps

The next sources that would materially improve redevelopment decisions are authoritative zoning and overlays, public-parcel development availability, protected/open-space and infrastructure constraints, active URA project commitments, and audited assemblage logic. Those require source-owner rules and authenticated handling before they should be presented as operational fields.
