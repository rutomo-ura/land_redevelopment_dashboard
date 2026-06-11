/*
Vacant land redevelopment triage exploration.

Safety:
- Read-only transaction.
- No inserts, updates, deletes, DDL, grants, or revokes.
- Run the whole script, or run individual SELECT blocks after BEGIN READ ONLY.
*/

BEGIN READ ONLY;

-- 1. Confirm geometry registration.
SELECT
    f_table_schema,
    f_table_name,
    f_geometry_column,
    srid,
    type
FROM public.geometry_columns
WHERE f_table_schema = 'gis'
  AND f_table_name = 'calculated_vacant_land';

-- 2. Preview available columns.
SELECT
    ordinal_position,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'gis'
  AND table_name = 'calculated_vacant_land'
ORDER BY ordinal_position;

-- 3. Basic parcel summary.
SELECT
    COUNT(*) AS parcels,
    ROUND(SUM(par_calcacreag)::numeric, 2) AS total_acres,
    ROUND(AVG(par_calcacreag)::numeric, 3) AS avg_acres,
    ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY par_calcacreag)::numeric,
        3
    ) AS median_acres,
    COUNT(*) FILTER (WHERE prior_years > 0) AS parcels_with_prior_tax_years,
    COUNT(*) FILTER (WHERE fairmarkettotal > 0) AS parcels_with_fmv,
    COUNT(*) FILTER (WHERE taxdesc = '20 - Taxable') AS taxable_vacant_land_parcels
FROM gis.calculated_vacant_land;

-- 4. Top use descriptions.
SELECT
    usedesc,
    COUNT(*) AS parcels,
    ROUND(SUM(par_calcacreag)::numeric, 2) AS acres
FROM gis.calculated_vacant_land
GROUP BY usedesc
ORDER BY parcels DESC
LIMIT 15;

-- 5. Tax status summary.
SELECT
    taxdesc,
    COUNT(*) AS parcels,
    ROUND(SUM(par_calcacreag)::numeric, 2) AS acres
FROM gis.calculated_vacant_land
GROUP BY taxdesc
ORDER BY parcels DESC;

-- 6. Prior delinquency year bands for map callouts.
WITH banded AS (
    SELECT
        CASE
            WHEN prior_years IS NULL OR prior_years = 0 THEN 'No known prior years'
            WHEN prior_years BETWEEN 1 AND 4 THEN '1-4 years'
            WHEN prior_years BETWEEN 5 AND 10 THEN '5-10 years'
            WHEN prior_years >= 11 THEN '11+ years'
            ELSE 'Review'
        END AS prior_years_band,
        par_calcacreag
    FROM gis.calculated_vacant_land
)
SELECT
    prior_years_band,
    COUNT(*) AS parcels,
    ROUND(SUM(par_calcacreag)::numeric, 2) AS acres
FROM banded
GROUP BY prior_years_band
ORDER BY
    CASE prior_years_band
        WHEN 'No known prior years' THEN 1
        WHEN '1-4 years' THEN 2
        WHEN '5-10 years' THEN 3
        WHEN '11+ years' THEN 4
        ELSE 5
    END;

-- 7. Candidate high-priority parcels for review, not final decisions.
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

-- 8. Large vacant parcels.
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

ROLLBACK;
