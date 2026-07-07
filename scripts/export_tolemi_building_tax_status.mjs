import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const endpoint = "https://cg.tolemi.com/q";
const outDir = path.resolve("exports");
const outCsv = path.join(outDir, "tolemi_building_tax_delinquency_status.csv");
const outStats = path.join(outDir, "tolemi_building_tax_delinquency_status.stats.json");

const headers = {
  "content-type": "application/json",
  "apollo-require-preflight": "true",
  "city-alias": "pittsburgh-pa",
  product: "buildingBlocks",
  "accept-language": "en",
};

const recordQuery =
  "query fetchAssetRecords($params: JSON, $savedViewId: ID) { assetRecords(params: $params, savedViewId: $savedViewId) }";

const countQuery =
  "query fetchAssetCount($filters: JSON, $includeBounds: Boolean) { assetCount(filters: $filters, includeBounds: $includeBounds) }";

const attributes = [
  "address",
  "street_address",
  "city",
  "state",
  "zip",
  "pid",
  "identity_owner",
  "filter3451",
  "filter1953",
  "filter2978",
  "filter192_value",
  "filter662",
  "filter2615_value",
  "filter2647_value",
  "filter550",
  "filter3299",
  "attribute4849",
  "score729705",
  "score729706",
];

const columns = [
  ["asset_id", "id"],
  ["parcel_id", "pid"],
  ["address", "_address"],
  ["street_address", "street_address"],
  ["city", "city"],
  ["state", "state"],
  ["zip", "zip"],
  ["owner", "identity_owner"],
  ["tax_delinquency_status", "filter3451"],
  ["property_type", "filter1953"],
  ["usps_is_flagged_vacant", "filter2978"],
  ["demolitions", "filter192_value"],
  ["code_violations_open", "filter662"],
  ["condemnations_by_type", "filter2615_value"],
  ["condemnation_yes_no", "filter2647_value"],
  ["tax_years_delinquent_city", "filter550"],
  ["total_taxes_plus_interest_penalties", "filter3299"],
  ["prior_years_delinquent_taxes", "attribute4849"],
  ["tax_sale_structure_score", "score729705"],
  ["tax_sale_vacant_lot_score", "score729706"],
];

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseAddress(value) {
  if (!value) return "";
  if (typeof value !== "string") return String(value);
  try {
    const parsed = JSON.parse(value);
    return parsed.address || parsed.commonName || value;
  } catch {
    return value;
  }
}

async function postGraphql(body) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  const json = JSON.parse(text);
  if (json.errors || json.error) {
    throw new Error(JSON.stringify(json.errors || json.error).slice(0, 1000));
  }
  return json.data;
}

async function fetchPage(page) {
  const body = {
    operationName: "fetchAssetRecords",
    query: recordQuery,
    variables: {
      params: {
        heatAttribute: "filter3451",
        filter3451: "Yes",
        attributes,
        sort: null,
        order: "asc",
        page,
        list: true,
      },
    },
  };
  return (await postGraphql(body)).assetRecords || [];
}

async function fetchPageWithRetry(page) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await fetchPage(page);
    } catch (error) {
      if (attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
    }
  }
  return [];
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const countData = await postGraphql({
    operationName: "fetchAssetCount",
    query: countQuery,
    variables: {
      filters: { heatAttribute: "filter3451", filter3451: "Yes" },
      includeBounds: false,
    },
  });

  const total = countData.assetCount.assetCount;
  const pageCount = Math.ceil(total / 100);
  const started = Date.now();
  const csvLines = [columns.map(([label]) => csvEscape(label)).join(",")];
  const seenAssetIds = new Set();
  const stats = {
    exported_at: new Date().toISOString(),
    source: "https://pittsburgh-pa.tolemi.com public BuildingBlocks list, heatAttribute filter3451, filter3451 Yes",
    total_expected: total,
    pages_expected: pageCount,
    raw_rows_seen: 0,
    duplicate_asset_ids_skipped: 0,
    rows_exported: 0,
    property_type: {},
    tax_years_delinquent_city: {},
    usps_is_flagged_vacant: {},
    non_null_counts: Object.fromEntries(columns.map(([label]) => [label, 0])),
  };

  let nextPage = 0;
  let completedPages = 0;
  const concurrency = Number(process.env.TOLEMI_EXPORT_CONCURRENCY || 30);

  function addRows(rows) {
    for (const row of rows) {
      stats.raw_rows_seen += 1;
      const assetId = String(row.id);
      if (seenAssetIds.has(assetId)) {
        stats.duplicate_asset_ids_skipped += 1;
        continue;
      }
      seenAssetIds.add(assetId);
      row._address = parseAddress(row.address);
      csvLines.push(columns.map(([label, key]) => {
        const value = row[key];
        if (value !== null && value !== undefined && String(value) !== "") {
          stats.non_null_counts[label] += 1;
        }
        return csvEscape(value);
      }).join(","));

      stats.rows_exported += 1;
      const propertyType = row.filter1953 ?? "(blank)";
      const taxYears = row.filter550 ?? "(blank)";
      const uspsVacant = row.filter2978 ?? "(blank)";
      stats.property_type[propertyType] = (stats.property_type[propertyType] || 0) + 1;
      stats.tax_years_delinquent_city[taxYears] = (stats.tax_years_delinquent_city[taxYears] || 0) + 1;
      stats.usps_is_flagged_vacant[uspsVacant] = (stats.usps_is_flagged_vacant[uspsVacant] || 0) + 1;
    }
  }

  async function worker() {
    while (nextPage < pageCount) {
      const page = nextPage;
      nextPage += 1;
      const rows = await fetchPageWithRetry(page);
      addRows(rows);
      completedPages += 1;
      if (completedPages % 50 === 0 || completedPages === pageCount) {
        const elapsed = Math.round((Date.now() - started) / 1000);
        console.error(`pages ${completedPages}/${pageCount}, rows ${stats.rows_exported}/${total}, ${elapsed}s`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  stats.elapsed_seconds = Math.round((Date.now() - started) / 1000);
  stats.tax_years_non_blank = total - (stats.tax_years_delinquent_city["(blank)"] || 0);

  await writeFile(outCsv, `${csvLines.join("\r\n")}\r\n`, "utf8");
  await writeFile(outStats, `${JSON.stringify(stats, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    outCsv,
    outStats,
    total,
    rows_exported: stats.rows_exported,
    elapsed_seconds: stats.elapsed_seconds,
    property_type: stats.property_type,
    tax_years_non_blank: stats.tax_years_non_blank,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
