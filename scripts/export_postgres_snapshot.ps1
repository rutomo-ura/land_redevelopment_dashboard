param(
    [string]$PsqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    [string]$HostName = $env:PGHOST,
    [int]$Port = $(if ($env:PGPORT) { [int]$env:PGPORT } else { 5432 }),
    [string]$Database = $env:PGDATABASE,
    [string]$Username = $env:PGUSER,
    [string]$OutDir = "C:\rutomo-codefolder\vacant-land-triage-map\exports",
    [string]$TableName = "gis.calculated_vacant_land"
)

$ErrorActionPreference = "Stop"

$resolvedPsql = $null
if (Test-Path -LiteralPath $PsqlPath) {
    $resolvedPsql = $PsqlPath
} else {
    $command = Get-Command $PsqlPath -ErrorAction SilentlyContinue
    if ($command) {
        $resolvedPsql = $command.Source
    }
}

if (-not $resolvedPsql) {
    throw "psql not found. Pass -PsqlPath or add psql to PATH."
}

if (-not $HostName -or -not $Database -or -not $Username) {
    throw "HostName, Database, and Username are required. Pass them as parameters or set PGHOST, PGDATABASE, and PGUSER."
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$summaryCsv = Join-Path $OutDir "vacant_land_summary.csv"
$candidatesCsv = Join-Path $OutDir "high_priority_candidates.csv"
$candidatesJson = Join-Path $OutDir "high_priority_candidates.json"
$broadGeoJson = Join-Path $OutDir "vacant_land_broad.geojson"
$focusedGeoJson = Join-Path $OutDir "vacant_land_focused.geojson"
$tax3yrCsv = Join-Path $OutDir "live_postgres_tax_delinquency_3yr.csv"

$summaryQuery = @"
COPY (
    SELECT
        COUNT(*) AS parcels,
        ROUND(SUM(par_calcacreag)::numeric, 2) AS total_acres,
        ROUND(AVG(par_calcacreag)::numeric, 3) AS avg_acres,
        COUNT(*) FILTER (WHERE prior_years > 0) AS parcels_with_prior_tax_years,
        COUNT(*) FILTER (WHERE taxdesc = '20 - Taxable') AS taxable_vacant_land_parcels
    FROM $TableName
) TO STDOUT WITH CSV HEADER
"@

$candidatesQuery = @"
COPY (
    SELECT
        par_pin,
        propertyowner,
        usedesc,
        taxdesc,
        par_calcacreag,
        fairmarkettotal,
        prior_years
    FROM $TableName
    WHERE par_calcacreag >= 0.05
      AND taxdesc = '20 - Taxable'
      AND prior_years >= 5
    ORDER BY prior_years DESC, par_calcacreag DESC
    LIMIT 100
) TO STDOUT WITH CSV HEADER
"@

$candidatesJsonQuery = @"
COPY (
    SELECT COALESCE(jsonb_agg(row_to_json(candidate)::jsonb), '[]'::jsonb)
    FROM (
        SELECT
            par_pin,
            propertyowner,
            usedesc,
            taxdesc,
            par_calcacreag,
            fairmarkettotal,
            prior_years
        FROM $TableName
        WHERE par_calcacreag >= 0.05
          AND taxdesc = '20 - Taxable'
          AND prior_years >= 5
        ORDER BY prior_years DESC, par_calcacreag DESC
        LIMIT 100
    ) AS candidate
) TO STDOUT
"@

$focusedGeoJsonQuery = @"
COPY (
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
            jsonb_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(shape)::jsonb,
                'properties', jsonb_build_object(
                    'par_pin', par_pin,
                    'propertyowner', propertyowner,
                    'usedesc', usedesc,
                    'taxdesc', taxdesc,
                    'par_calcacreag', par_calcacreag,
                    'fairmarkettotal', fairmarkettotal,
                    'prior_years', prior_years
                )
            )
        ), '[]'::jsonb)
    )
    FROM $TableName
    WHERE par_calcacreag >= 0.05
      AND taxdesc = '20 - Taxable'
      AND prior_years >= 5
) TO STDOUT
"@

$broadGeoJsonQuery = @"
COPY (
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
            jsonb_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(shape)::jsonb,
                'properties', jsonb_build_object(
                    'par_pin', par_pin,
                    'propertyowner', propertyowner,
                    'usedesc', usedesc,
                    'taxdesc', taxdesc,
                    'par_calcacreag', par_calcacreag,
                    'fairmarkettotal', fairmarkettotal,
                    'prior_years', prior_years
                )
            )
        ), '[]'::jsonb)
    )
    FROM $TableName
    WHERE par_calcacreag >= 0.05
) TO STDOUT
"@

$tax3yrQuery = @"
COPY (
    SELECT
        pin,
        address,
        billing_city,
        current_delq,
        current_delq_pi,
        prior_years,
        prior_delq_tax,
        prior_delq_pi,
        total_owed,
        state_description,
        neighborhood,
        council_district,
        ward,
        longitude,
        latitude
    FROM gis.city_tax_delinquent_3yr
) TO STDOUT WITH CSV HEADER
"@

$psqlArgs = @(
    "-h", $HostName,
    "-p", $Port,
    "-d", $Database,
    "-U", $Username,
    "-w",
    "-q",
    "-X",
    "-v", "ON_ERROR_STOP=1"
)

& $resolvedPsql @psqlArgs -c "BEGIN READ ONLY;" -c $summaryQuery -c "ROLLBACK;" | Set-Content -LiteralPath $summaryCsv -Encoding UTF8
& $resolvedPsql @psqlArgs -c "BEGIN READ ONLY;" -c $candidatesQuery -c "ROLLBACK;" | Set-Content -LiteralPath $candidatesCsv -Encoding UTF8
& $resolvedPsql @psqlArgs -c "BEGIN READ ONLY;" -c $candidatesJsonQuery -c "ROLLBACK;" | Set-Content -LiteralPath $candidatesJson -Encoding UTF8
& $resolvedPsql @psqlArgs -c "BEGIN READ ONLY;" -c $broadGeoJsonQuery -c "ROLLBACK;" | Set-Content -LiteralPath $broadGeoJson -Encoding UTF8
& $resolvedPsql @psqlArgs -c "BEGIN READ ONLY;" -c $focusedGeoJsonQuery -c "ROLLBACK;" | Set-Content -LiteralPath $focusedGeoJson -Encoding UTF8
& $resolvedPsql @psqlArgs -c "BEGIN READ ONLY;" -c $tax3yrQuery -c "ROLLBACK;" | Set-Content -LiteralPath $tax3yrCsv -Encoding UTF8

Write-Output "Wrote $summaryCsv"
Write-Output "Wrote $candidatesCsv"
Write-Output "Wrote $candidatesJson"
Write-Output "Wrote $broadGeoJson"
Write-Output "Wrote $focusedGeoJson"
Write-Output "Wrote $tax3yrCsv"
