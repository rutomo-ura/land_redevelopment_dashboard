/*
Area-level vacant land analysis.

This script supports two presentation lenses:

1. ZIP vacancy penetration:
   residential-ish vacant parcels / all residential assessment parcels in ZIP.

2. Named neighborhood concentration:
   vacant parcels matched to EPP neighborhood names. Treat this as concentration
   within the available EPP-linked inventory, not a true citywide neighborhood rate.
*/

BEGIN READ ONLY;

WITH residential_vacant AS (
    SELECT
        v.par_pin,
        v.par_calcacreag,
        COALESCE(v.prior_years, 0) AS prior_years,
        a.propertyzip,
        a.yearblt
    FROM gis.calculated_vacant_land v
    JOIN analysis.assessment_snapshot a
      ON a.parid = v.par_pin
    WHERE a.classdesc = 'RESIDENTIAL'
      AND v.par_calcacreag >= 0.01
      AND v.par_calcacreag <= 2
      AND v.usedesc IS NOT NULL
      AND v.usedesc NOT IN (
          'MUNICIPAL GOVERNMENT',
          'MUNICIPAL URBAN RENEWAL',
          'COUNTY GOVERNMENT',
          'STATE GOVERNMENT',
          'FEDERAL GOVERNMENT',
          'TOWNSHIP GOVERNMENT',
          'OWNED BY BOARD OF EDUCATION',
          'OWNED BY COLLEGE/UNIV/ACADEMY',
          'OWNED BY METRO HOUSING AU',
          'PUBLIC PARK',
          'R.R. - USED IN OPERATION',
          'R.R. - NOT USED IN OPERATION',
          'VACANT COMMERCIAL LAND',
          'VACANT INDUSTRIAL LAND',
          'COMMERCIAL/UTILITY',
          'PARKING GARAGE/LOTS',
          'CEMETERY/MONUMENTS',
          'AIR RIGHTS',
          'RIGHT OF WAY - RESIDENTIAL',
          'RIGHT OF WAY - COMMERCIAL',
          'RETENTION POND - RESIDENTIAL',
          'COMMERCIAL GARAGE',
          'DISTRIBUTION WAREHOUSE',
          'WAREHOUSE',
          'WAREHOUSE/MULTI-TENANT',
          'MINI WAREHOUSE',
          'OFFICE/WAREHOUSE',
          'OFFICE-ELEVATOR -3 + STORIES',
          'CONDOMINIUM OFFICE BUILDING',
          'CHURCHES, PUBLIC WORSHIP'
      )
      AND (
          v.usedesc IN (
              'VACANT LAND',
              'BUILDERS LOT',
              'SINGLE FAMILY',
              'TWO FAMILY',
              'THREE FAMILY',
              'FOUR FAMILY',
              'ROWHOUSE',
              'TOWNHOUSE',
              'RES AUX BUILDING (NO HOUSE)',
              'CONDO DEVELOPMENTAL LAND'
          )
          OR v.usedesc LIKE 'APART:%'
      )
),
zip_totals AS (
    SELECT
        propertyzip,
        COUNT(*) AS total_residential_parcels,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY 2026 - yearblt)
            FILTER (WHERE yearblt BETWEEN 1800 AND 2026) AS median_building_age
    FROM analysis.assessment_snapshot
    WHERE classdesc = 'RESIDENTIAL'
      AND propertyzip IS NOT NULL
    GROUP BY propertyzip
),
zip_vacant AS (
    SELECT
        propertyzip,
        COUNT(*) AS residential_vacant_parcels,
        ROUND(SUM(par_calcacreag)::numeric, 2) AS vacant_acres,
        COUNT(*) FILTER (WHERE prior_years >= 5) AS parcels_prior_years_5_plus,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY prior_years) AS median_prior_years
    FROM residential_vacant
    WHERE propertyzip IS NOT NULL
    GROUP BY propertyzip
)
SELECT
    t.propertyzip,
    t.total_residential_parcels,
    COALESCE(v.residential_vacant_parcels, 0) AS residential_vacant_parcels,
    ROUND(
        COALESCE(v.residential_vacant_parcels, 0)::numeric
        / NULLIF(t.total_residential_parcels, 0) * 100,
        1
    ) AS vacant_penetration_pct,
    COALESCE(v.vacant_acres, 0) AS vacant_acres,
    COALESCE(v.parcels_prior_years_5_plus, 0) AS parcels_prior_years_5_plus,
    ROUND(t.median_building_age::numeric, 1) AS median_building_age,
    ROUND(COALESCE(v.median_prior_years, 0)::numeric, 1) AS median_prior_years
FROM zip_totals t
LEFT JOIN zip_vacant v USING (propertyzip)
WHERE t.total_residential_parcels >= 100
ORDER BY vacant_penetration_pct DESC, residential_vacant_parcels DESC;

WITH residential_vacant AS (
    SELECT
        v.par_pin,
        v.par_calcacreag,
        COALESCE(v.prior_years, 0) AS prior_years,
        a.yearblt,
        e.neighborhood
    FROM gis.calculated_vacant_land v
    JOIN analysis.assessment_snapshot a
      ON a.parid = v.par_pin
    JOIN gis.epp_parcels_full e
      ON e.par_pin = v.par_pin
    WHERE a.classdesc = 'RESIDENTIAL'
      AND e.neighborhood IS NOT NULL
      AND v.par_calcacreag >= 0.01
      AND v.par_calcacreag <= 2
      AND v.usedesc IS NOT NULL
      AND v.usedesc NOT IN (
          'MUNICIPAL GOVERNMENT',
          'MUNICIPAL URBAN RENEWAL',
          'COUNTY GOVERNMENT',
          'STATE GOVERNMENT',
          'FEDERAL GOVERNMENT',
          'TOWNSHIP GOVERNMENT',
          'OWNED BY BOARD OF EDUCATION',
          'OWNED BY COLLEGE/UNIV/ACADEMY',
          'OWNED BY METRO HOUSING AU',
          'PUBLIC PARK',
          'R.R. - USED IN OPERATION',
          'R.R. - NOT USED IN OPERATION',
          'VACANT COMMERCIAL LAND',
          'VACANT INDUSTRIAL LAND',
          'COMMERCIAL/UTILITY',
          'PARKING GARAGE/LOTS',
          'CEMETERY/MONUMENTS',
          'AIR RIGHTS',
          'RIGHT OF WAY - RESIDENTIAL',
          'RIGHT OF WAY - COMMERCIAL',
          'RETENTION POND - RESIDENTIAL',
          'COMMERCIAL GARAGE',
          'DISTRIBUTION WAREHOUSE',
          'WAREHOUSE',
          'WAREHOUSE/MULTI-TENANT',
          'MINI WAREHOUSE',
          'OFFICE/WAREHOUSE',
          'OFFICE-ELEVATOR -3 + STORIES',
          'CONDOMINIUM OFFICE BUILDING',
          'CHURCHES, PUBLIC WORSHIP'
      )
      AND (
          v.usedesc IN (
              'VACANT LAND',
              'BUILDERS LOT',
              'SINGLE FAMILY',
              'TWO FAMILY',
              'THREE FAMILY',
              'FOUR FAMILY',
              'ROWHOUSE',
              'TOWNHOUSE',
              'RES AUX BUILDING (NO HOUSE)',
              'CONDO DEVELOPMENTAL LAND'
          )
          OR v.usedesc LIKE 'APART:%'
      )
),
epp_totals AS (
    SELECT
        neighborhood,
        COUNT(*) AS epp_parcels,
        COUNT(*) FILTER (
            WHERE current_status ILIKE '%vacant%'
               OR inventory_type ILIKE '%vacant%'
               OR property_class ILIKE '%vacant%'
        ) AS epp_vacant_like_parcels
    FROM gis.epp_parcels_full
    WHERE neighborhood IS NOT NULL
    GROUP BY neighborhood
),
neighborhood_vacant AS (
    SELECT
        neighborhood,
        COUNT(*) AS residential_vacant_parcels,
        ROUND(SUM(par_calcacreag)::numeric, 2) AS vacant_acres,
        COUNT(*) FILTER (WHERE prior_years >= 5) AS parcels_prior_years_5_plus,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY prior_years) AS median_prior_years,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY 2026 - yearblt)
            FILTER (WHERE yearblt BETWEEN 1800 AND 2026) AS median_building_age
    FROM residential_vacant
    GROUP BY neighborhood
)
SELECT
    t.neighborhood,
    t.epp_parcels,
    t.epp_vacant_like_parcels,
    ROUND(t.epp_vacant_like_parcels::numeric / NULLIF(t.epp_parcels, 0) * 100, 1)
        AS epp_vacant_like_share_pct,
    COALESCE(v.residential_vacant_parcels, 0) AS residential_vacant_parcels,
    COALESCE(v.vacant_acres, 0) AS vacant_acres,
    COALESCE(v.parcels_prior_years_5_plus, 0) AS parcels_prior_years_5_plus,
    ROUND(v.median_building_age::numeric, 1) AS median_building_age,
    ROUND(COALESCE(v.median_prior_years, 0)::numeric, 1) AS median_prior_years
FROM epp_totals t
LEFT JOIN neighborhood_vacant v USING (neighborhood)
WHERE t.epp_parcels >= 50
ORDER BY residential_vacant_parcels DESC, epp_vacant_like_share_pct DESC;

ROLLBACK;
