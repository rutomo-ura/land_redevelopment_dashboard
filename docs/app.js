const APP_TITLE = "Vacant Land Redevelopment Explorer";
const LAYER_SOURCES_URL = "data/layer_sources.json?v=redevelopment-explorer-20260709";

const signalModes = {
  tax: {
    label: "Tax delinquency",
    shortLabel: "Tax",
    helper: "Prior-year history",
    field: "prior_band",
    chartTitle: "Tax Breakdown",
    categories: [
      { value: "11+ prior years", label: "11+ prior years", color: "#d8332a", outline: "#8f1d18" },
      { value: "5-10 prior years", label: "5-10 prior years", color: "#e97827", outline: "#9b4818" },
      { value: "1-4 prior years", label: "1-4 prior years", color: "#f0c24b", outline: "#9f7411" },
      { value: "No known prior years", label: "No known prior years", color: "#c7d0d5", outline: "#65727b" }
    ]
  },
  ownership: {
    label: "Ownership",
    shortLabel: "Ownership",
    helper: "Public/control grouping",
    field: "ownership_group",
    chartTitle: "Ownership Breakdown",
    categories: [
      { value: "Private / Other", label: "Private / Other", color: "#d8e4ea", outline: "#7d8990" },
      { value: "City Owned", label: "City Owned", color: "#e7df00", outline: "#aaa400", showInOwnershipLegend: true },
      { value: "URA Owned", label: "URA Owned", color: "#0098d3", outline: "#006c9f", showInOwnershipLegend: true },
      { value: "PLB Owned", label: "PLB Owned", color: "#14582e", outline: "#0a341a", showInOwnershipLegend: true },
      { value: "HACP Owned", label: "HACP Owned", color: "#554a8f", outline: "#342b66" },
      { value: "Other Public / Institutional", label: "Other Public", color: "#8a8f98", outline: "#545b62" }
    ]
  },
  condemned: {
    label: "Condemned",
    shortLabel: "Condemned",
    helper: "Matched parcel overlap",
    field: "condemned_flag",
    chartTitle: "Condemned Overlap",
    categories: [
      { value: "Condemned overlap", label: "Condemned overlap", color: "#c54036", outline: "#7d231e" },
      { value: "Not flagged", label: "Not flagged", color: "#c7d0d5", outline: "#65727b" }
    ]
  }
};

const preferredUseOrder = [
  "Residential",
  "Commercial",
  "Industrial",
  "Public / institutional",
  "Infrastructure / utility",
  "Other / review"
];

const publicOwnershipGroups = new Set([
  "City Owned",
  "URA Owned",
  "PLB Owned",
  "HACP Owned",
  "Other Public / Institutional"
]);

const excludedDashboardUseGroups = new Set([
  "Infrastructure / utility"
]);

const excludedDashboardUses = new Set([
  "R.R. - USED IN OPERATION",
  "R.R. - NOT USED IN OPERATION",
  "COMMERCIAL/UTILITY",
  "RIGHT OF WAY - RESIDENTIAL",
  "RIGHT OF WAY - COMMERCIAL",
  "RETENTION POND - RESIDENTIAL",
  "AIR RIGHTS",
  "CEMETERY/MONUMENTS"
]);

const state = {
  signalMode: "tax",
  activeUseGroups: new Set(),
  activeSignalValues: {
    tax: new Set(signalModes.tax.categories.map((item) => item.value)),
    ownership: new Set(signalModes.ownership.categories.map((item) => item.value)),
    condemned: new Set(signalModes.condemned.categories.map((item) => item.value))
  }
};

const nodes = {
  sourceFreshness: document.getElementById("sourceFreshness"),
  signalModeControls: document.getElementById("signalModeControls"),
  useGroupFilters: document.getElementById("useGroupFilters"),
  signalFilters: document.getElementById("signalFilters"),
  signalFilterHeading: document.getElementById("signalFilterHeading"),
  sideLegend: document.getElementById("sideLegend"),
  mapLegend: document.getElementById("mapLegend"),
  mapStatus: document.getElementById("mapStatus"),
  exportStatus: document.getElementById("exportStatus"),
  exportPdfButton: document.getElementById("exportPdfButton"),
  arcgisContentLink: document.getElementById("arcgisContentLink"),
  resetFilters: document.getElementById("resetFilters"),
  visibleParcelMetric: document.getElementById("visibleParcelMetric"),
  longDelinquencyMetric: document.getElementById("longDelinquencyMetric"),
  publicControlMetric: document.getElementById("publicControlMetric"),
  condemnedMetric: document.getElementById("condemnedMetric"),
  signalChartTitle: document.getElementById("signalChartTitle"),
  signalChart: document.getElementById("signalChart"),
  areaChart: document.getElementById("areaChart"),
  reviewTableBody: document.getElementById("reviewTableBody")
};

let allFeatures = [];
let useGroupItems = [];
let layerSources = null;
let parcelDataSource = "geojson";
let view = null;
let parcelLayer = null;
let parcelLayerView = null;
let reactiveUtilsRef = null;
let reverseGeocodeRef = null;

const REVERSE_GEOCODE_URL = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "Not recorded";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatAcreage(value) {
  if (value === null || value === undefined || value === "") return "Not recorded";
  const number = Number(value);
  if (!Number.isFinite(number)) return "Not recorded";
  return `${number.toFixed(number >= 1 ? 2 : 3)} ac`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    };
    return entities[char];
  });
}

function sqlEscape(value) {
  return String(value).replaceAll("'", "''");
}

function getProp(feature, field) {
  return feature?.properties?.[field] ?? feature?.[field];
}

function isDashboardParcel(feature) {
  const useGroup = getProp(feature, "use_group");
  const useDesc = String(getProp(feature, "usedesc") || "").trim().toUpperCase();
  return !excludedDashboardUseGroups.has(useGroup) && !excludedDashboardUses.has(useDesc);
}

function countBy(features, field) {
  const counts = new Map();
  features.forEach((feature) => {
    const value = getProp(feature, field) || "Not recorded";
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return counts;
}

function sortByPreferred(values, preferred) {
  return [...values].sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.localeCompare(b);
  });
}

function categoryItemsForMode(modeName, features = allFeatures) {
  const mode = signalModes[modeName];
  const counts = countBy(features, mode.field);
  return mode.categories.map((item) => ({
    ...item,
    count: counts.get(item.value) || 0
  }));
}

function useItems(features = allFeatures) {
  const counts = countBy(features, "use_group");
  return sortByPreferred(counts.keys(), preferredUseOrder).map((value) => ({
    value,
    label: value,
    color: useColor(value),
    count: counts.get(value) || 0
  }));
}

function useColor(value) {
  const colors = {
    Residential: "#0098d3",
    Commercial: "#554a8f",
    Industrial: "#636a73",
    "Public / institutional": "#267a4b",
    "Infrastructure / utility": "#c96f2d",
    "Other / review": "#8a8f98"
  };
  return colors[value] || "#8a8f98";
}

function signalColorField() {
  return signalModes[state.signalMode].field;
}

function signalColorLegendTitle() {
  return signalModes[state.signalMode].label;
}

function signalLegendItems(features = filteredFeatures()) {
  const field = signalColorField();
  const counts = countBy(features, field);
  return categoryItemsForMode(state.signalMode).map((item) => ({
    ...item,
    count: counts.get(item.value) || 0
  }));
}

function signalRendererItems() {
  return categoryItemsForMode(state.signalMode);
}

function defaultUseGroupValues() {
  const values = useGroupItems.map((item) => item.value);
  const defaults = ["Residential", "Commercial"].filter((value) => values.includes(value));
  if (defaults.length) return defaults;
  return values.length ? [values[0]] : [];
}

async function loadLayerSources() {
  const response = await fetch(LAYER_SOURCES_URL);
  if (!response.ok) throw new Error(`Layer config failed with ${response.status}`);
  return response.json();
}

function updateSourceFreshness(message) {
  if (nodes.sourceFreshness) nodes.sourceFreshness.textContent = message;
}

function sourceFreshnessLabel(source) {
  if (source === "feature-service") return "URA ArcGIS feature layer";
  if (source === "arcgis-geojson-url") return "URA ArcGIS GeoJSON URL";
  if (source === "arcgis-geojson-item") return "URA ArcGIS GeoJSON item";
  return "Public GeoJSON bundle";
}

function preferredArcGisContentUrl() {
  return layerSources?.arcgisAppUrl
    || layerSources?.arcgisDashboardUrl
    || layerSources?.webmapUrl
    || (layerSources?.webmapItemId
      ? `${layerSources.portalUrl}/apps/mapviewer/index.html?webmap=${layerSources.webmapItemId}`
      : null);
}

function updateArcGisContentLink() {
  const url = preferredArcGisContentUrl();
  if (!nodes.arcgisContentLink || !url) return;

  nodes.arcgisContentLink.href = url;
  nodes.arcgisContentLink.textContent = layerSources?.arcgisAppItemId || layerSources?.arcgisAppUrl || layerSources?.arcgisDashboardUrl
    ? "URA Maps"
    : "ArcGIS Map";
  nodes.arcgisContentLink.setAttribute(
    "aria-label",
    nodes.arcgisContentLink.textContent === "URA Maps"
      ? `Open ${layerSources?.arcgisAppTitle || "this dashboard"} from URA Maps ArcGIS`
      : "Open the source web map in ArcGIS Map Viewer"
  );
}

function parcelLayerConfig() {
  return {
    title: layerSources?.parcelLayerTitle || "Vacant land parcels",
    outFields: ["*"],
    popupTemplate: {
      title: "{parcel_label}",
      content: buildPopupContent
    }
  };
}

async function loadFeaturesFromGeoJsonUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Public GeoJSON failed with ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    throw new Error("GeoJSON request returned an HTML page");
  }
  const data = await response.json();
  return data.features || [];
}

async function loadFeaturesFromLayer(layer) {
  if (typeof layer?.queryFeatures !== "function") {
    throw new Error("Layer does not support feature queries");
  }
  return queryAllParcelAttributes(layer);
}

async function queryAllParcelAttributes(layer) {
  const features = [];
  let start = 0;
  const pageSize = 2000;
  while (true) {
    const result = await layer.queryFeatures({
      where: "1=1",
      outFields: ["*"],
      returnGeometry: false,
      num: pageSize,
      start
    });
    features.push(...result.features);
    if (!result.exceededTransferLimit) break;
    start += pageSize;
  }
  return features.map((feature) => ({
    properties: { ...feature.attributes },
    attributes: feature.attributes
  }));
}

function featureMatchesActiveFilters(feature) {
  const props = feature.properties || feature;
  const useGroup = props.use_group || "Not recorded";
  if (!state.activeUseGroups.has(useGroup)) return false;

  const mode = signalModes[state.signalMode];
  const signalValue = props[mode.field] || "Not recorded";
  return state.activeSignalValues[state.signalMode].has(signalValue);
}

function filteredFeatures() {
  return allFeatures.filter(featureMatchesActiveFilters);
}

function buildInClause(field, activeValues, allValues) {
  if (activeValues.size === 0) return "1=0";
  if (activeValues.size === allValues.length) return null;
  const values = [...activeValues].map((value) => `'${sqlEscape(value)}'`);
  return `${field} IN (${values.join(",")})`;
}

function buildWhereClause() {
  const mode = signalModes[state.signalMode];
  const signalValues = mode.categories.map((item) => item.value);
  const clauses = [
    buildInClause("use_group", state.activeUseGroups, useGroupItems.map((item) => item.value)),
    buildInClause(mode.field, state.activeSignalValues[state.signalMode], signalValues)
  ].filter(Boolean);
  return clauses.length ? clauses.join(" AND ") : "1=1";
}

function uniqueValueRenderer(field, items) {
  return {
    type: "unique-value",
    field,
    defaultSymbol: {
      type: "simple-fill",
      color: [198, 208, 213, 0.62],
      outline: { color: [101, 114, 123, 0.7], width: 0.45 }
    },
    uniqueValueInfos: items.map((item) => ({
      value: item.value,
      label: item.label,
      symbol: {
        type: "simple-fill",
        color: `${item.color}bf`,
        outline: { color: item.outline || item.color, width: 0.65 }
      }
    }))
  };
}

function renderFilterList(container, items, activeValues, onChange, options = {}) {
  const showSwatches = options.showSwatches !== false;
  container.innerHTML = items.map((item) => {
    const checked = activeValues.has(item.value) ? "checked" : "";
    const swatch = showSwatches
      ? `<span class="swatch" style="background:${item.color}"></span>`
      : "";
    return `
      <label class="filter-item">
        <span class="filter-left">
          <input type="checkbox" value="${escapeHtml(item.value)}" ${checked} />
          ${swatch}
          <span class="filter-label">${escapeHtml(item.label)}</span>
        </span>
        <span class="filter-count">${formatNumber(item.count)}</span>
      </label>
    `;
  }).join("");

  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        activeValues.add(input.value);
      } else if (activeValues.size <= 1) {
        input.checked = true;
        return;
      } else {
        activeValues.delete(input.value);
      }
      onChange();
    });
  });
}

function renderSignalModeControls() {
  nodes.signalModeControls.innerHTML = Object.entries(signalModes).map(([key, mode]) => `
    <button class="segment-button ${state.signalMode === key ? "is-active" : ""}" type="button" data-signal-mode="${key}">
      ${escapeHtml(mode.label)}
      <span>${escapeHtml(mode.helper)}</span>
    </button>
  `).join("");
}

function renderFilters() {
  const mode = signalModes[state.signalMode];
  nodes.signalFilterHeading.textContent = mode.label;
  renderFilterList(nodes.useGroupFilters, useGroupItems, state.activeUseGroups, applyDashboardState, { showSwatches: false });
  renderFilterList(nodes.signalFilters, categoryItemsForMode(state.signalMode), state.activeSignalValues[state.signalMode], applyDashboardState);
}

function legendItems() {
  const items = signalLegendItems(filteredFeatures());
  if (state.signalMode === "ownership") {
    return items.filter((item) => item.showInOwnershipLegend);
  }
  return items;
}

function legendHtml(includeTitle = false) {
  const title = includeTitle ? `<strong class="legend-title">${escapeHtml(signalColorLegendTitle())}</strong>` : "";
  const ownershipLegend = state.signalMode === "ownership";
  return `
    ${title}
    <div class="legend-list ${ownershipLegend ? "ownership-legend-list" : ""}">
      ${legendItems().map((item) => `
        <div class="legend-item ${ownershipLegend ? "ownership-legend-item" : ""}">
          <span class="legend-swatch ${ownershipLegend ? "ownership-swatch" : ""}" style="background:${item.color}"></span>
          <span class="legend-label">${escapeHtml(item.label)}</span>
          ${ownershipLegend ? "" : `<span class="legend-count">${formatNumber(item.count)}</span>`}
        </div>
      `).join("")}
    </div>
  `;
}

function renderLegends() {
  nodes.sideLegend.innerHTML = legendHtml(false);
  nodes.mapLegend.innerHTML = legendHtml(true);
}

function renderMetricCards(features) {
  const longDelinquent = features.filter((feature) => getProp(feature, "prior_band") === "11+ prior years").length;
  const publicControl = features.filter((feature) => publicOwnershipGroups.has(getProp(feature, "ownership_group"))).length;
  const condemned = features.filter((feature) => getProp(feature, "condemned_flag") === "Condemned overlap").length;
  nodes.visibleParcelMetric.textContent = formatNumber(features.length);
  nodes.longDelinquencyMetric.textContent = formatNumber(longDelinquent);
  nodes.publicControlMetric.textContent = formatNumber(publicControl);
  nodes.condemnedMetric.textContent = formatNumber(condemned);
}

function renderBarChart(container, items, emptyLabel) {
  if (!items.length) {
    container.innerHTML = `<div class="empty-chart">${escapeHtml(emptyLabel)}</div>`;
    return;
  }
  const max = Math.max(...items.map((item) => item.value), 1);
  container.innerHTML = items.map((item) => {
    const width = Math.max((item.value / max) * 100, item.value ? 3 : 0);
    return `
      <div class="chart-row">
        <span class="chart-label">${escapeHtml(item.label)}</span>
        <span class="chart-track"><span class="chart-bar" style="width:${width}%; background:${item.color || "#0098d3"}"></span></span>
        <span class="chart-value">${formatNumber(item.value)}</span>
      </div>
    `;
  }).join("");
}

function groupedAreaRows(features) {
  const rows = new Map();
  features.forEach((feature) => {
    const props = feature.properties || feature;
    const area = props.city_neighborhood || "Neighborhood not recorded";
    if (!rows.has(area)) {
      rows.set(area, { area, parcels: 0, long: 0, condemned: 0 });
    }
    const row = rows.get(area);
    row.parcels += 1;
    if (props.prior_band === "11+ prior years") row.long += 1;
    if (props.condemned_flag === "Condemned overlap") row.condemned += 1;
  });
  return [...rows.values()].sort((a, b) => b.parcels - a.parcels || b.long - a.long).slice(0, 7);
}

function renderSummary(features) {
  const mode = signalModes[state.signalMode];
  const signalCounts = countBy(features, mode.field);
  const signalItems = categoryItemsForMode(state.signalMode).map((item) => ({
    ...item,
    value: signalCounts.get(item.value) || 0
  }));
  const areaRows = groupedAreaRows(features);

  nodes.signalChartTitle.textContent = mode.chartTitle;
  renderBarChart(nodes.signalChart, signalItems, "No parcels match the current filters.");
  renderBarChart(
    nodes.areaChart,
    areaRows.map((row) => ({ label: row.area, value: row.parcels, color: "#0098d3" })),
    "No neighborhoods match the current filters."
  );

  nodes.reviewTableBody.innerHTML = areaRows.length
    ? areaRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.area)}</td>
        <td>${formatNumber(row.parcels)}</td>
        <td>${formatNumber(row.long)}</td>
        <td>${formatNumber(row.condemned)}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="4">No parcels match the current filters.</td></tr>`;
}

function setStatus(message, isHidden = false) {
  nodes.mapStatus.textContent = message;
  nodes.mapStatus.classList.toggle("is-hidden", isHidden);
}

function applyLayerState() {
  if (!parcelLayer) return;
  const field = signalColorField();
  parcelLayer.renderer = uniqueValueRenderer(field, signalRendererItems());
  parcelLayer.definitionExpression = buildWhereClause();
}

function applyDashboardState() {
  const features = filteredFeatures();
  renderSignalModeControls();
  renderFilters();
  renderLegends();
  renderMetricCards(features);
  renderSummary(features);
  applyLayerState();

  if (!allFeatures.length) {
    setStatus("Loading vacant land parcels...");
  } else if (!features.length) {
    setStatus("No parcels match the current filters.");
  } else {
    setStatus("", true);
  }
}

function resetFilters() {
  state.activeUseGroups = new Set(defaultUseGroupValues());
  Object.entries(signalModes).forEach(([key, mode]) => {
    state.activeSignalValues[key] = new Set(mode.categories.map((item) => item.value));
  });
  applyDashboardState();
}

function buildPopupContent(event) {
  const attrs = event.graphic.attributes;
  const addressPromise = lookupParcelAddress(event.graphic);
  return addressPromise.then((address) => `
    <dl class="popup-grid">
      <dt>Parcel</dt><dd>${escapeHtml(attrs.parcel_label || attrs.par_pin)}</dd>
      <dt>Address</dt><dd>${escapeHtml(address || "Address not available")}</dd>
      <dt>PIN</dt><dd>${escapeHtml(attrs.par_pin || "Not recorded")}</dd>
      <dt>Prior years</dt><dd>${escapeHtml(attrs.prior_years ?? "No known prior years")}</dd>
      <dt>Tax band</dt><dd>${escapeHtml(attrs.prior_band)}</dd>
      <dt>Ownership</dt><dd>${escapeHtml(attrs.ownership_group)}</dd>
      <dt>Control path</dt><dd>${escapeHtml(attrs.control_path)}</dd>
      <dt>Condemned</dt><dd>${escapeHtml(attrs.condemned_flag || "Not flagged")}</dd>
      <dt>Inspection band</dt><dd>${escapeHtml(attrs.condemned_score_band || "Not flagged")}</dd>
      <dt>Use group</dt><dd>${escapeHtml(attrs.use_group)}</dd>
      <dt>Neighborhood</dt><dd>${escapeHtml(attrs.city_neighborhood)}</dd>
      <dt>Council</dt><dd>${escapeHtml(attrs.council_district_label)}</dd>
      <dt>Acreage</dt><dd>${formatAcreage(attrs.par_calcacreag)}</dd>
      <dt>Fair market value</dt><dd>${formatMoney(attrs.fairmarkettotal)}</dd>
    </dl>
  `);
}

async function lookupParcelAddress(graphic) {
  if (!reverseGeocodeRef || !graphic?.geometry) return null;
  const location = graphic.geometry.type === "polygon" ? graphic.geometry.centroid : graphic.geometry;
  if (!location) return null;
  try {
    const result = await reverseGeocodeRef(REVERSE_GEOCODE_URL, { location });
    const address = result?.address;
    return address?.LongLabel || address?.Match_addr || address?.Address || null;
  } catch (error) {
    console.warn("Reverse geocode failed for parcel popup.", error);
    return null;
  }
}

function activeFilterSummary() {
  const mode = signalModes[state.signalMode];
  const useText = state.activeUseGroups.size === useGroupItems.length
    ? "All property uses"
    : [...state.activeUseGroups].join(", ");
  const signalText = state.activeSignalValues[state.signalMode].size === mode.categories.length
    ? `All ${mode.label.toLowerCase()} categories`
    : [...state.activeSignalValues[state.signalMode]].join(", ");
  return [mode.label, useText, signalText];
}

function exportStats(features) {
  return {
    visible: features.length,
    longDelinquency: features.filter((feature) => getProp(feature, "prior_band") === "11+ prior years").length,
    publicControl: features.filter((feature) => publicOwnershipGroups.has(getProp(feature, "ownership_group"))).length,
    condemned: features.filter((feature) => getProp(feature, "condemned_flag") === "Condemned overlap").length,
    topAreas: groupedAreaRows(features).slice(0, 5)
  };
}

function buildPreparingPrintHtml() {
  return `
    <!doctype html>
    <html>
      <head><title>Preparing ${escapeHtml(APP_TITLE)} PDF</title></head>
      <body style="font-family:Arial,sans-serif;padding:24px;color:#142935">
        <h1>Preparing map export</h1>
        <p>Capturing the current map extent, filters, and legend.</p>
      </body>
    </html>
  `;
}

function buildPrintHtml(mapImage, stats) {
  const filters = activeFilterSummary();
  const timestamp = new Date().toLocaleString();
  return `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(APP_TITLE)}</title>
        <style>
          @page { size: A3 landscape; margin: 0.35in; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #142935; background: #eef4f7; font-family: Arial, sans-serif; }
          .print-header { display: flex; justify-content: space-between; gap: 18px; margin-bottom: 12px; }
          h1 { margin: 0 0 4px; font-size: 25px; }
          p { margin: 0; color: #667985; font-size: 11px; line-height: 1.35; }
          .print-page { display: grid; grid-template-columns: minmax(0, 1.55fr) 0.75fr; gap: 12px; }
          .print-map, .print-card { background: #fff; border: 1px solid #d8e4ea; border-radius: 8px; }
          .print-map { min-height: 610px; overflow: hidden; }
          .print-map img { display: block; width: 100%; height: 100%; object-fit: cover; }
          .print-side { display: grid; gap: 10px; align-content: start; }
          .print-card { padding: 11px; }
          .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .metric strong { display: block; color: #006c9f; font-size: 24px; line-height: 1; }
          .metric span, h2 { color: #142935; font-size: 11px; font-weight: 800; text-transform: uppercase; }
          h2 { margin: 0 0 8px; }
          .legend-item, .filter-item, .area-row { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; gap: 7px; align-items: center; min-height: 22px; font-size: 11px; }
          .legend-item span:first-child { width: 10px; height: 10px; border-radius: 50%; }
          .filter-item { grid-template-columns: minmax(0, 1fr); color: #334a56; }
          .area-row { grid-template-columns: minmax(0, 1fr) auto auto auto; }
          .source { border-top: 1px solid #d8e4ea; padding-top: 8px; }
        </style>
      </head>
      <body>
        <header class="print-header">
          <div>
            <h1>${escapeHtml(APP_TITLE)}</h1>
            <p>Generated ${escapeHtml(timestamp)} | Current map extent and active dashboard filters</p>
          </div>
          <p>Public-safe bundle. Screening only; confirm source records before action.</p>
        </header>
        <main class="print-page">
          <section class="print-map"><img src="${mapImage}" alt="Current vacant land map" /></section>
          <aside class="print-side">
            <section class="print-card metrics">
              <div class="metric"><span>Visible parcels</span><strong>${formatNumber(stats.visible)}</strong></div>
              <div class="metric"><span>11+ prior years</span><strong>${formatNumber(stats.longDelinquency)}</strong></div>
              <div class="metric"><span>Public/control</span><strong>${formatNumber(stats.publicControl)}</strong></div>
              <div class="metric"><span>Condemned</span><strong>${formatNumber(stats.condemned)}</strong></div>
            </section>
            <section class="print-card">
              <h2>Filters</h2>
              ${filters.map((item) => `<div class="filter-item">${escapeHtml(item)}</div>`).join("")}
            </section>
            <section class="print-card">
              <h2>Legend: ${escapeHtml(signalColorLegendTitle())}</h2>
              ${legendItems().map((item) => `
                <div class="legend-item">
                  <span style="background:${item.color}"></span>
                  <strong>${escapeHtml(item.label)}</strong>
                  <em>${formatNumber(item.count)}</em>
                </div>
              `).join("")}
            </section>
            <section class="print-card">
              <h2>Top Areas</h2>
              ${stats.topAreas.map((row) => `
                <div class="area-row">
                  <strong>${escapeHtml(row.area)}</strong>
                  <span>${formatNumber(row.parcels)}</span>
                  <span>${formatNumber(row.long)} 11+</span>
                  <span>${formatNumber(row.condemned)} cond.</span>
                </div>
              `).join("") || "<p>No parcels match the current filters.</p>"}
            </section>
            <section class="print-card source">
              <p>Sources: sanitized vacant-land public GeoJSON, tax delinquency fields, ownership/control classification, and condemned overlap flag. Owner names, addresses, internal notes, and detailed legal/account records are excluded.</p>
            </section>
          </aside>
        </main>
      </body>
    </html>
  `;
}

async function captureMapImage() {
  if (!view) throw new Error("Map is not ready");
  await view.when();
  if (reactiveUtilsRef && parcelLayerView) {
    await reactiveUtilsRef.whenOnce(() => !parcelLayerView.updating);
  }
  const screenshot = await view.takeScreenshot({ format: "png", quality: 95 });
  return screenshot.dataUrl;
}

async function exportCurrentMapPdf() {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    nodes.exportStatus.textContent = "Export blocked. Allow pop-ups and try again.";
    return;
  }

  const previousLabel = nodes.exportPdfButton.textContent;
  nodes.exportPdfButton.disabled = true;
  nodes.exportPdfButton.textContent = "Preparing";
  nodes.exportStatus.textContent = "Preparing map export";
  printWindow.document.write(buildPreparingPrintHtml());
  printWindow.document.close();

  try {
    const features = filteredFeatures();
    const stats = exportStats(features);
    const mapImage = await captureMapImage();
    printWindow.document.open();
    printWindow.document.write(buildPrintHtml(mapImage, stats));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 500);
    nodes.exportStatus.textContent = "PDF ready";
    window.setTimeout(() => {
      nodes.exportStatus.textContent = "";
    }, 3500);
  } catch (error) {
    console.error(error);
    nodes.exportStatus.textContent = "Export failed. Try again after the map finishes loading.";
  } finally {
    nodes.exportPdfButton.disabled = false;
    nodes.exportPdfButton.textContent = previousLabel;
  }
}

async function loadPublicData() {
  try {
    if (parcelDataSource !== "geojson") {
      try {
        allFeatures = await loadFeaturesFromLayer(parcelLayer);
      } catch (error) {
        console.warn("ArcGIS layer query failed; using public GeoJSON bundle for analytics.", error);
        allFeatures = await loadFeaturesFromGeoJsonUrl(layerSources.parcelLocalGeoJsonUrl || layerSources.parcelGeoJsonUrl);
      }
    } else {
      allFeatures = await loadFeaturesFromGeoJsonUrl(layerSources.parcelLocalGeoJsonUrl || layerSources.parcelGeoJsonUrl);
    }

    allFeatures = allFeatures.filter(isDashboardParcel);
    useGroupItems = useItems(allFeatures);
    state.activeUseGroups = new Set(defaultUseGroupValues());
    updateSourceFreshness(
      `${sourceFreshnessLabel(parcelDataSource)} | ${formatNumber(allFeatures.length)} parcels | Source review required before action`
    );
    applyDashboardState();
  } catch (error) {
    console.error(error);
    setStatus("Parcel data did not load. Check the URA ArcGIS layer or public bundle path.", false);
  }
}

async function createParcelLayerFromArcGIS(GeoJSONLayer, FeatureLayer) {
  if (layerSources.parcelFeatureServiceUrl) {
    try {
      const layer = new FeatureLayer({
        url: layerSources.parcelFeatureServiceUrl,
        ...parcelLayerConfig()
      });
      await layer.load();
      return { layer, source: "feature-service" };
    } catch (error) {
      console.warn("URA ArcGIS feature service unavailable; trying GeoJSON source.", error);
    }
  }

  if (layerSources.parcelGeoJsonUrl) {
    try {
      const layer = new GeoJSONLayer({
        url: layerSources.parcelGeoJsonUrl,
        ...parcelLayerConfig()
      });
      await layer.load();
      return { layer, source: "arcgis-geojson-url" };
    } catch (error) {
      console.warn("URA ArcGIS GeoJSON URL unavailable; trying portal item.", error);
    }
  }

  if (layerSources.parcelLayerItemId) {
    try {
      const layer = new GeoJSONLayer({
        portalItem: {
          id: layerSources.parcelLayerItemId,
          portal: { url: layerSources.portalUrl }
        },
        ...parcelLayerConfig()
      });
      await layer.load();
      return { layer, source: "arcgis-geojson-item" };
    } catch (error) {
      console.warn("URA ArcGIS portal item unavailable; using local fallback.", error);
    }
  }

  throw new Error("No URA ArcGIS parcel source configured");
}

async function createParcelLayerFallback(GeoJSONLayer) {
  const layer = new GeoJSONLayer({
    url: layerSources.parcelLocalGeoJsonUrl || layerSources.parcelGeoJsonUrl,
    title: layerSources.parcelLayerTitle || "Vacant land parcels",
    outFields: ["*"],
    renderer: uniqueValueRenderer(signalColorField(), signalRendererItems()),
    popupTemplate: {
      title: "{parcel_label}",
      content: buildPopupContent
    }
  });
  await layer.load();
  return { layer, source: "geojson" };
}

document.addEventListener("click", (event) => {
  const signalButton = event.target.closest("[data-signal-mode]");
  if (signalButton) {
    state.signalMode = signalButton.dataset.signalMode;
    applyDashboardState();
    return;
  }

  const bookmark = event.target.closest(".bookmark");
  if (bookmark && view) {
    const center = bookmark.dataset.center.split(",").map(Number);
    const zoom = Number(bookmark.dataset.zoom);
    view.goTo({ center, zoom }, { duration: 650 }).catch(() => {});
  }
});

nodes.resetFilters.addEventListener("click", resetFilters);
nodes.exportPdfButton.addEventListener("click", exportCurrentMapPdf);

renderSignalModeControls();
setStatus("Loading vacant land parcels...");

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer",
  "esri/layers/FeatureLayer",
  "esri/widgets/Home",
  "esri/widgets/Search",
  "esri/widgets/BasemapToggle",
  "esri/widgets/Expand",
  "esri/widgets/Legend",
  "esri/core/reactiveUtils",
  "esri/rest/locator"
], (Map, MapView, GeoJSONLayer, FeatureLayer, Home, Search, BasemapToggle, Expand, Legend, reactiveUtils, locator) => {
  reactiveUtilsRef = reactiveUtils;
  reverseGeocodeRef = locator.reverseGeocode;

  async function initDashboard() {
    try {
      layerSources = await loadLayerSources();
      updateArcGisContentLink();
      let map = null;

      try {
        const arcgisResult = await createParcelLayerFromArcGIS(GeoJSONLayer, FeatureLayer);
        parcelLayer = arcgisResult.layer;
        parcelDataSource = arcgisResult.source;
      } catch (error) {
        console.warn("URA ArcGIS parcel layer unavailable; using public GeoJSON fallback.", error);
        const fallbackResult = await createParcelLayerFallback(GeoJSONLayer);
        parcelLayer = fallbackResult.layer;
        parcelDataSource = fallbackResult.source;
      }

      map = new Map({
        basemap: "topo-vector",
        layers: [parcelLayer]
      });

      view = new MapView({
        container: "viewDiv",
        map,
        center: [-79.9959, 40.4406],
        zoom: 12,
        constraints: {
          minZoom: 10
        },
        popup: {
          dockEnabled: true,
          dockOptions: {
            buttonEnabled: false,
            breakpoint: false,
            position: "bottom-left"
          }
        }
      });

      view.ui.add(new Home({ view }), "top-left");
      view.ui.add(new Search({ view, includeDefaultSources: true }), "top-right");
      view.ui.add(new BasemapToggle({ view, nextBasemap: "satellite" }), "bottom-right");
      view.ui.add(new Expand({
        view,
        content: new Legend({ view, layerInfos: [{ layer: parcelLayer, title: parcelLayer.title || "Vacant land parcels" }] }),
        expanded: false,
        expandTooltip: "ArcGIS legend"
      }), "top-left");

      view.whenLayerView(parcelLayer).then((layerView) => {
        parcelLayerView = layerView;
      });

      await parcelLayer.when();
      await loadPublicData();
      applyLayerState();
      view.goTo(parcelLayer.fullExtent.expand(1.08), { duration: 600 }).catch(() => {});
    } catch (error) {
      console.error(error);
      setStatus("Map layer did not load. Check the URA ArcGIS parcel item or public bundle path.", false);
    }
  }

  initDashboard();
});
