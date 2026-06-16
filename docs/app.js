const bands = [
  {
    value: "11+ prior years",
    label: "11+ prior years",
    color: "#111820",
    outline: "#000000",
    count: 3667
  },
  {
    value: "5-10 prior years",
    label: "5-10 prior years",
    color: "#0098d3",
    outline: "#005f88",
    count: 903
  },
  {
    value: "1-4 prior years",
    label: "1-4 prior years",
    color: "#f0c24b",
    outline: "#9f7411",
    count: 2209
  },
  {
    value: "No known prior years",
    label: "No known prior years",
    color: "#c7d0d5",
    outline: "#65727b",
    count: 23480
  }
];

const useGroups = [
  {
    value: "Residential",
    label: "Residential",
    color: "#0098d3",
    count: 20663,
    defaultActive: true
  },
  {
    value: "Commercial",
    label: "Commercial",
    color: "#7d5fff",
    count: 1561,
    defaultActive: false
  },
  {
    value: "Industrial",
    label: "Industrial",
    color: "#636a73",
    count: 127,
    defaultActive: false
  },
  {
    value: "Public / institutional",
    label: "Public / institutional",
    color: "#46a758",
    count: 7117,
    defaultActive: false
  },
  {
    value: "Infrastructure / utility",
    label: "Infrastructure / utility",
    color: "#b86b00",
    count: 476,
    defaultActive: false
  },
  {
    value: "Other / review",
    label: "Other / review",
    color: "#8a8f98",
    count: 315,
    defaultActive: false
  }
];

const ownershipGroups = [
  {
    value: "City Owned",
    label: "City Owned",
    color: "#f7f700",
    outline: "#a9a000",
    count: 8756
  },
  {
    value: "URA Owned",
    label: "URA Owned",
    color: "#0094d3",
    outline: "#006c9f",
    count: 822
  },
  {
    value: "PLB Owned",
    label: "PLB Owned",
    color: "#0e532a",
    outline: "#063315",
    count: 14
  },
  {
    value: "HACP Owned",
    label: "HACP Owned",
    color: "#554a8f",
    outline: "#342b66",
    count: 4
  },
  {
    value: "Other Public / Institutional",
    label: "Other Public / Institutional",
    color: "#8a8f98",
    outline: "#545b62",
    count: 966
  },
  {
    value: "Private / Other",
    label: "Private / Other",
    color: "#d8e4ea",
    outline: "#7d8990",
    count: 19697
  }
];

const ownershipMapGroups = ownershipGroups.filter((group) => (
  group.value === "City Owned"
  || group.value === "URA Owned"
  || group.value === "PLB Owned"
));

const activeBands = new Set(bands.map((band) => band.value));
const defaultUseGroups = useGroups.filter((group) => group.defaultActive).map((group) => group.value);
const activeUseGroups = new Set(defaultUseGroups);
const activeOwnershipGroups = new Set(ownershipGroups.map((group) => group.value));
const statusNode = document.getElementById("mapStatus");
const areaFocusCard = document.getElementById("areaFocusCard");
let handleModuleChange = () => {};
let applyLayerFilters = () => {};
let currentRenderMode = "prior";
let currentModule = "overview";

const useGroupChartData = useGroups.map((group) => ({
  label: group.label,
  value: group.count,
  color: group.color,
  metricLabel: "mapped parcels"
}));

const priorBandChartData = bands.map((band) => ({
  label: band.label,
  value: band.count,
  color: band.color,
  metricLabel: "mapped parcels"
}));

let ownershipChartData = ownershipGroups.map((group) => ({
  label: group.label,
  value: group.count,
  color: group.color,
  metricLabel: "mapped parcels"
}));

let neighborhoodChartData = [
  { label: "Hazelwood", value: 1455, boundaryType: "neighborhood", boundaryValue: "Hazelwood", metricLabel: "mapped parcels" },
  { label: "Perry South", value: 1318, boundaryType: "neighborhood", boundaryValue: "Perry South", metricLabel: "mapped parcels" },
  { label: "Homewood North", value: 1245, boundaryType: "neighborhood", boundaryValue: "Homewood North", metricLabel: "mapped parcels" },
  { label: "Lincoln-Lemington-Belmar", value: 1074, boundaryType: "neighborhood", boundaryValue: "Lincoln-Lemington-Belmar", metricLabel: "mapped parcels" },
  { label: "Middle Hill", value: 913, boundaryType: "neighborhood", boundaryValue: "Middle Hill", metricLabel: "mapped parcels" },
  { label: "Homewood South", value: 839, boundaryType: "neighborhood", boundaryValue: "Homewood South", metricLabel: "mapped parcels" },
  { label: "Larimer", value: 815, boundaryType: "neighborhood", boundaryValue: "Larimer", metricLabel: "mapped parcels" },
  { label: "South Side Slopes", value: 801, boundaryType: "neighborhood", boundaryValue: "South Side Slopes", metricLabel: "mapped parcels" }
];

let councilChartData = [
  { label: "D9", value: 5930, boundaryType: "council", boundaryValue: "D9", metricLabel: "mapped parcels" },
  { label: "D6", value: 5219, boundaryType: "council", boundaryValue: "D6", metricLabel: "mapped parcels" },
  { label: "D2", value: 4535, boundaryType: "council", boundaryValue: "D2", metricLabel: "mapped parcels" },
  { label: "D1", value: 3574, boundaryType: "council", boundaryValue: "D1", metricLabel: "mapped parcels" },
  { label: "D3", value: 3391, boundaryType: "council", boundaryValue: "D3", metricLabel: "mapped parcels" },
  { label: "D5", value: 3255, boundaryType: "council", boundaryValue: "D5", metricLabel: "mapped parcels" },
  { label: "D4", value: 2365, boundaryType: "council", boundaryValue: "D4", metricLabel: "mapped parcels" },
  { label: "D7", value: 1435, boundaryType: "council", boundaryValue: "D7", metricLabel: "mapped parcels" },
  { label: "D8", value: 357, boundaryType: "council", boundaryValue: "D8", metricLabel: "mapped parcels" }
];

const zipChartData = [
  { label: "15219 - Central Pittsburgh / Hill District", value: 35.3, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration", boundaryType: "zip", boundaryValue: "15219" },
  { label: "15208 - Homewood / Point Breeze", value: 34.4, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration", boundaryType: "zip", boundaryValue: "15208" },
  { label: "15235 - Penn Hills area", value: 32.6, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration", boundaryType: "zip", boundaryValue: "15235" },
  { label: "15120 - Homestead area", value: 27.7, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration", boundaryType: "zip", boundaryValue: "15120" },
  { label: "15233 - North Side / Manchester", value: 27.4, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration", boundaryType: "zip", boundaryValue: "15233" },
  { label: "15214 - North Side / Observatory Hill", value: 26.8, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration", boundaryType: "zip", boundaryValue: "15214" },
  { label: "15221 - Wilkinsburg / East End", value: 26.8, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration", boundaryType: "zip", boundaryValue: "15221" },
  { label: "15207 - Hazelwood / Greenfield", value: 25.0, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration", boundaryType: "zip", boundaryValue: "15207" }
];

const zipMedianYearsData = [
  { label: "15235 - Penn Hills area", value: 14.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years", boundaryType: "zip", boundaryValue: "15235" },
  { label: "15221 - Wilkinsburg / East End", value: 5.5, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years", boundaryType: "zip", boundaryValue: "15221" },
  { label: "15219 - Central Pittsburgh / Hill District", value: 0.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years", boundaryType: "zip", boundaryValue: "15219" },
  { label: "15208 - Homewood / Point Breeze", value: 0.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years", boundaryType: "zip", boundaryValue: "15208" },
  { label: "15214 - North Side / Observatory Hill", value: 0.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years", boundaryType: "zip", boundaryValue: "15214" },
  { label: "15207 - Hazelwood / Greenfield", value: 0.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years", boundaryType: "zip", boundaryValue: "15207" },
  { label: "15212 - North Side", value: 0.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years", boundaryType: "zip", boundaryValue: "15212" },
  { label: "15210 - South Pittsburgh", value: 0.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years", boundaryType: "zip", boundaryValue: "15210" }
];

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "Not recorded";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "Not recorded";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function escapeHtml(value) {
  return String(value ?? "Not recorded").replace(/[&<>"']/g, (char) => {
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

function buildPopupContent(feature) {
  const attrs = feature.graphic.attributes;
  return `
    <dl class="popup-grid">
      <dt>Parcel PIN</dt><dd>${escapeHtml(attrs.par_pin)}</dd>
      <dt>Prior years</dt><dd>${escapeHtml(attrs.prior_years ?? "No known prior years")}</dd>
      <dt>Use group</dt><dd>${escapeHtml(attrs.use_group)}</dd>
      <dt>Ownership group</dt><dd>${escapeHtml(attrs.ownership_group)}</dd>
      <dt>City neighborhood</dt><dd>${escapeHtml(attrs.city_neighborhood)}</dd>
      <dt>Council district</dt><dd>${escapeHtml(attrs.council_district_label)}</dd>
      <dt>Use</dt><dd>${escapeHtml(attrs.usedesc)}</dd>
      <dt>Tax status</dt><dd>${escapeHtml(attrs.taxdesc)}</dd>
      <dt>Acreage</dt><dd>${escapeHtml(attrs.par_calcacreag)}</dd>
      <dt>Fair market value</dt><dd>${formatMoney(attrs.fairmarkettotal)}</dd>
    </dl>
  `;
}

function setStatus(message, isHidden = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle("is-hidden", isHidden);
}

function moduleFromLocation() {
  const knownModules = new Set(["overview", "vacant-land", "ownership", "acquisition", "public-property", "assemblages", "context"]);
  const storedModule = window.sessionStorage?.getItem("dashboardModule");
  if (storedModule) window.sessionStorage.removeItem("dashboardModule");
  if (storedModule && knownModules.has(storedModule)) return storedModule;

  const params = new URLSearchParams(window.location.search);
  const queryModule = params.get("module");
  if (queryModule && knownModules.has(queryModule)) return queryModule;

  const lastSegment = window.location.pathname.split("/").filter(Boolean).pop();
  return knownModules.has(lastSegment) ? lastSegment : "overview";
}

function appBasePath() {
  const knownModules = new Set(["overview", "vacant-land", "ownership", "acquisition", "public-property", "assemblages", "context"]);
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (knownModules.has(segments[segments.length - 1])) segments.pop();
  return `/${segments.join("/")}${segments.length ? "/" : ""}`;
}

function updateModuleUrl(moduleName) {
  if (!window.history?.pushState) return;
  const basePath = appBasePath();
  const nextPath = moduleName === "overview" ? basePath : `${basePath}${moduleName}`;
  if (window.location.pathname !== nextPath) {
    window.history.pushState({ moduleName }, "", nextPath);
  }
}

function activateModule(moduleName, updateUrl = true, runHandler = true) {
  const tabs = document.querySelectorAll("[data-module]");
  const panels = document.querySelectorAll("[data-module-panel]");
  const nextModule = document.querySelector(`[data-module="${moduleName}"]`) ? moduleName : "overview";
  currentModule = nextModule;

  tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.module === nextModule);
  });
  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.modulePanel === nextModule);
  });

  if (updateUrl) updateModuleUrl(nextModule);
  if (runHandler) handleModuleChange(nextModule);
}

function renderModuleTabs() {
  document.querySelectorAll("[data-module]").forEach((tab) => {
    tab.addEventListener("click", () => activateModule(tab.dataset.module));
  });
  window.addEventListener("popstate", () => activateModule(moduleFromLocation(), false));
}

function boundaryTypeLabel(type) {
  const labels = {
    zip: "ZIP",
    neighborhood: "Neighborhood",
    council: "Council district"
  };
  return labels[type] || "Area";
}

function setAreaFocus(item) {
  const suffix = item.suffix ?? "";
  const valueLabel = suffix ? `${item.value.toFixed(1)}${suffix}` : formatNumber(item.value);

  areaFocusCard.innerHTML = `
    <span class="area-focus-kicker">${escapeHtml(boundaryTypeLabel(item.boundaryType))} focus</span>
    <strong>${escapeHtml(item.label)}</strong>
    <span>${escapeHtml(valueLabel)} ${escapeHtml(item.metricLabel)}</span>
    <em>Click the active row again or use Citywide to clear.</em>
  `;
  areaFocusCard.classList.remove("is-hidden");
}

function buildInClause(field, activeValues, allValues) {
  if (activeValues.size === 0) return "1=0";
  if (activeValues.size === allValues.length) return null;
  const values = [...activeValues].map((value) => `'${value.replaceAll("'", "''")}'`);
  return `${field} IN (${values.join(",")})`;
}

function buildWhereClause() {
  const clauses = currentRenderMode === "ownership"
    ? [
      buildInClause("ownership_group", activeOwnershipGroups, ownershipMapGroups)
    ].filter(Boolean)
    : [
      buildInClause("use_group", activeUseGroups, useGroups),
      buildInClause("prior_band", activeBands, bands)
    ].filter(Boolean);

  return clauses.length ? clauses.join(" AND ") : "1=1";
}

function buildOwnershipReferenceWhereClause() {
  const clause = buildInClause("inventory_type", activeOwnershipGroups, ownershipMapGroups);
  return clause || "1=1";
}

function renderFilterList({ containerId, items, activeValues, onChange }) {
  const filterList = document.getElementById(containerId);
  if (!filterList) return;
  filterList.innerHTML = "";

  items.forEach((item) => {
    const label = document.createElement("label");
    label.className = "filter-item";
    const isChecked = activeValues.has(item.value);
    label.innerHTML = `
      <span class="filter-left">
        <input type="checkbox" value="${escapeHtml(item.value)}" ${isChecked ? "checked" : ""} />
        <span class="swatch" style="background:${item.color}"></span>
        <span class="filter-label">${escapeHtml(item.label)}</span>
      </span>
      <span class="filter-count">${formatNumber(item.count)}</span>
    `;

    const input = label.querySelector("input");
    input.addEventListener("change", () => {
      if (input.checked) activeValues.add(item.value);
      else activeValues.delete(item.value);
      onChange();
    });

    filterList.appendChild(label);
  });
}

function syncFilterCheckboxes(containerId, activeValues) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll("input").forEach((input) => {
    input.checked = activeValues.has(input.value);
  });
}

function renderFilters(layer, afterUpdate = () => {}) {
  const updateLayerFilter = () => {
    layer.definitionExpression = buildWhereClause();
    afterUpdate();
  };
  applyLayerFilters = updateLayerFilter;

  renderFilterList({
    containerId: "useGroupFilters",
    items: useGroups,
    activeValues: activeUseGroups,
    onChange: updateLayerFilter
  });

  renderFilterList({
    containerId: "bandFilters",
    items: bands,
    activeValues: activeBands,
    onChange: updateLayerFilter
  });

  renderFilterList({
    containerId: "ownershipGroupFilters",
    items: ownershipMapGroups,
    activeValues: activeOwnershipGroups,
    onChange: updateLayerFilter
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    activeBands.clear();
    bands.forEach((band) => activeBands.add(band.value));
    activeUseGroups.clear();
    defaultUseGroups.forEach((group) => activeUseGroups.add(group));
    activeOwnershipGroups.clear();
    (currentRenderMode === "ownership" ? ownershipMapGroups : ownershipGroups).forEach((group) => {
      activeOwnershipGroups.add(group.value);
    });
    syncFilterCheckboxes("bandFilters", activeBands);
    syncFilterCheckboxes("useGroupFilters", activeUseGroups);
    syncFilterCheckboxes("ownershipGroupFilters", activeOwnershipGroups);
    updateLayerFilter();
  });
}

function renderMapLegend(mode = currentRenderMode) {
  const legend = document.getElementById("mapLegend");
  const items = mode === "ownership" ? ownershipMapGroups : bands;
  const heading = mode === "ownership" ? "Ownership / Control" : "Prior-Year History";
  legend.innerHTML = `
    <div class="legend-heading">${escapeHtml(heading)}</div>
    <div class="legend-items">
      ${items.map((item) => `
        <div class="legend-item">
          <span class="swatch" style="background:${item.color}"></span>
          <span class="legend-label">${escapeHtml(item.label)}</span>
          <span class="legend-count">${formatNumber(item.count)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderBarChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const maxValue = Math.max(...data.map((item) => item.value));

  container.innerHTML = data.map((item) => {
    const percent = Math.max((item.value / maxValue) * 100, 3);
    const suffix = item.suffix ?? "";
    const valueLabel = suffix ? `${item.value.toFixed(1)}${suffix}` : formatNumber(item.value);
    const isClickable = item.boundaryType && item.boundaryValue;
    const tagName = isClickable ? "button" : "div";
    const barStyle = item.color ? ` style="width:${percent}%;background:${item.color}"` : ` style="width:${percent}%"`;
    const boundaryAttrs = isClickable
      ? ` type="button" data-area-type="${escapeHtml(item.boundaryType)}" data-boundary-value="${escapeHtml(item.boundaryValue)}" data-metric="${escapeHtml(item.metricId || "count")}"`
      : "";
    const buttonClass = isClickable ? " chart-row-button" : "";

    return `
      <${tagName} class="chart-row${buttonClass}"${boundaryAttrs}>
        <div class="chart-label">${escapeHtml(item.label)}</div>
        <div class="chart-track" aria-hidden="true">
          <span class="chart-bar"${barStyle}></span>
        </div>
        <div class="chart-value">${escapeHtml(valueLabel)}</div>
      </${tagName}>
    `;
  }).join("");
}

function rowsFromBoundarySummary(rows, boundaryType) {
  return rows.map((row) => ({
    label: row.label,
    value: row.value,
    boundaryType,
    boundaryValue: row.label,
    metricId: "count",
    metricLabel: "mapped parcels"
  }));
}

function renderBoundaryCharts(analysis) {
  neighborhoodChartData = rowsFromBoundarySummary(analysis.neighborhoods || neighborhoodChartData, "neighborhood");
  councilChartData = rowsFromBoundarySummary(analysis.councilDistricts || councilChartData, "council");
  renderBarChart("neighborhoodChart", neighborhoodChartData);
  renderBarChart("councilChart", councilChartData);
}

async function loadBoundaryAnalysis() {
  try {
    const response = await fetch("data/boundary_analysis.json");
    if (!response.ok) throw new Error(`Boundary summary failed with ${response.status}`);
    const analysis = await response.json();
    renderBoundaryCharts(analysis);
  } catch (error) {
    console.warn(error);
    renderBarChart("neighborhoodChart", neighborhoodChartData);
    renderBarChart("councilChart", councilChartData);
  }
}

function updateOwnershipGroupCounts(groups) {
  const counts = new Map(groups.map((group) => [group.label, group.value]));
  ownershipGroups.forEach((group) => {
    group.count = counts.get(group.value) ?? group.count;
  });
}

function renderOwnershipKpis(kpis = {}) {
  const container = document.getElementById("ownershipKpis");
  if (!container) return;

  const counts = new Map(ownershipGroups.map((group) => [group.value, group.count]));

  container.innerHTML = `
    <article class="kpi ownership-kpi">
      <span class="kpi-value">${formatNumber(counts.get("City Owned") ?? 0)}</span>
      <span class="kpi-label">City owned parcels</span>
    </article>
    <article class="kpi ownership-kpi">
      <span class="kpi-value">${formatNumber(counts.get("URA Owned") ?? 0)}</span>
      <span class="kpi-label">URA owned parcels</span>
    </article>
    <article class="kpi ownership-kpi">
      <span class="kpi-value">${formatNumber(counts.get("PLB Owned") ?? 0)}</span>
      <span class="kpi-label">PLB owned parcels</span>
    </article>
    <article class="kpi ownership-kpi">
      <span class="kpi-value">${formatNumber(kpis.referencePublicAcres ?? 0)}</span>
      <span class="kpi-label">public acres</span>
    </article>
  `;
}

function renderOwnershipAnalysis(analysis = {}) {
  const groups = analysis.groups || ownershipGroups.map((group) => ({
    label: group.label,
    value: group.count,
    acres: null,
    source: null
  }));
  updateOwnershipGroupCounts(groups);
  renderOwnershipKpis(analysis.kpis);
  ownershipChartData = ownershipMapGroups.map((group) => {
    const item = groups.find((candidate) => candidate.label === group.value);
    return {
      label: group.label,
      value: item?.value ?? group.count,
      color: group.color,
      metricLabel: "mapped parcels"
    };
  });
  renderBarChart("ownershipMixChart", ownershipChartData);
  renderOwnershipTable(groups.filter((item) => ownershipMapGroups.some((group) => group.value === item.label)));
}

function renderOwnershipTable(groups) {
  const tableBody = document.getElementById("ownershipTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = groups.map((item) => `
    <tr>
      <td>${escapeHtml(item.label)}</td>
      <td>${formatNumber(item.value)}</td>
      <td>${item.acres === null || item.acres === undefined ? "Not recorded" : formatNumber(item.acres)}</td>
    </tr>
  `).join("");
}

async function loadOwnershipAnalysis() {
  try {
    const response = await fetch("data/ownership_analysis.json");
    if (!response.ok) throw new Error(`Ownership summary failed with ${response.status}`);
    const analysis = await response.json();
    renderOwnershipAnalysis(analysis);
  } catch (error) {
    console.warn(error);
    renderOwnershipAnalysis();
  }
}

renderModuleTabs();
activateModule(moduleFromLocation(), true, false);
renderBarChart("useGroupChart", useGroupChartData);
renderBarChart("priorBandChart", priorBandChartData);
renderOwnershipAnalysis();
renderBoundaryCharts({ neighborhoods: neighborhoodChartData, councilDistricts: councilChartData });
renderBarChart("zipChart", zipChartData);
renderBarChart("zipMedianYearsChart", zipMedianYearsData);
loadBoundaryAnalysis();
loadOwnershipAnalysis();

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer",
  "esri/layers/FeatureLayer",
  "esri/widgets/Home",
  "esri/widgets/Search",
  "esri/widgets/BasemapToggle",
  "esri/widgets/Legend",
  "esri/widgets/Expand"
], (Map, MapView, GeoJSONLayer, FeatureLayer, Home, Search, BasemapToggle, Legend, Expand) => {
  function uniqueValueRenderer(field, items, defaultColor = [180, 188, 190, 0.7], defaultOutline = [80, 90, 94, 0.7]) {
    return {
      type: "unique-value",
      field,
      defaultSymbol: {
        type: "simple-fill",
        color: defaultColor,
        outline: { color: defaultOutline, width: 0.6 }
      },
      uniqueValueInfos: items.map((item) => ({
        value: item.value,
        label: item.label,
        symbol: {
          type: "simple-fill",
          color: `${item.color}bf`,
          outline: { color: item.outline, width: 0.75 }
        }
      }))
    };
  }

  const priorRenderer = uniqueValueRenderer("prior_band", bands);
  const ownershipRenderer = uniqueValueRenderer(
    "ownership_group",
    ownershipMapGroups,
    [255, 255, 255, 0],
    [255, 255, 255, 0]
  );
  const ownershipReferenceRenderer = {
    type: "unique-value",
    field: "inventory_type",
    defaultSymbol: {
      type: "simple-fill",
      color: [255, 255, 255, 0],
      outline: { color: [255, 255, 255, 0], width: 0 }
    },
    uniqueValueInfos: ownershipMapGroups.map((item) => ({
      value: item.value,
      label: item.label,
      symbol: {
        type: "simple-fill",
        color: item.color,
        outline: { color: [153, 153, 153, 0.25], width: 0 }
      }
    }))
  };

  const ownershipLabelingInfo = [{
    labelExpressionInfo: { expression: "$feature.parcel_label" },
    labelPlacement: "always-horizontal",
    minScale: 18000,
    symbol: {
      type: "text",
      color: "#ffffff",
      haloColor: "#1f2b33",
      haloSize: 1,
      font: {
        family: "Arial",
        size: 9,
        weight: "bold"
      }
    }
  }];

  const parcelLayer = new GeoJSONLayer({
    url: "data/vacant_land_triage.geojson?v=ownership-labels-20260616",
    title: "Vacant Land Parcels",
    outFields: ["*"],
    renderer: priorRenderer,
    definitionExpression: buildWhereClause(),
    opacity: 0.86,
    popupTemplate: {
      title: "{prior_band}",
      content: buildPopupContent
    }
  });

  const ownershipReferenceLayer = new FeatureLayer({
    url: "https://services1.arcgis.com/0DMNBNaacQNEfN4H/arcgis/rest/services/gisdb_gis_epp_parcels_full/FeatureServer/0",
    title: "City, URA, PLB Owned Parcels",
    outFields: [
      "inventory_type",
      "parcel_number",
      "par_pin",
      "par_mapblocklo",
      "current_status",
      "neighborhood",
      "council_district",
      "project_name"
    ],
    renderer: ownershipReferenceRenderer,
    definitionExpression: buildOwnershipReferenceWhereClause(),
    visible: false,
    opacity: 1,
    popupTemplate: {
      title: "{inventory_type}",
      content: `
        <dl class="popup-list">
          <dt>Parcel</dt><dd>{parcel_number}</dd>
          <dt>Map-block-lot</dt><dd>{par_mapblocklo}</dd>
          <dt>Status</dt><dd>{current_status}</dd>
          <dt>Neighborhood</dt><dd>{neighborhood}</dd>
          <dt>Council district</dt><dd>{council_district}</dd>
        </dl>
      `
    }
  });

  const countyParcelReferenceLayer = new FeatureLayer({
    url: "https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0",
    title: "Allegheny County Parcel Reference",
    outFields: ["MAPBLOCKLOT"],
    visible: false,
    minScale: 18056,
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [0, 0, 0, 0],
        outline: { color: [133, 133, 133, 1], width: 1 }
      }
    },
    labelingInfo: [{
      labelExpressionInfo: { expression: "$feature.MAPBLOCKLOT" },
      labelPlacement: "always-horizontal",
      minScale: 1398,
      symbol: {
        type: "text",
        color: "#000000",
        haloColor: "#ffffff",
        haloSize: 1.5,
        font: {
          family: "Tahoma",
          size: 8.25,
          weight: "bold"
        }
      }
    }],
    popupEnabled: false
  });

  const zipBoundaryLayer = new FeatureLayer({
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/2",
    title: "Selected ZIP Code Boundary",
    outFields: ["ZCTA5", "BASENAME"],
    definitionExpression: "1=0",
    visible: true,
    opacity: 1,
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [0, 152, 211, 0.08],
        outline: {
          color: [0, 152, 211, 1],
          width: 3
        }
      }
    },
    popupEnabled: false
  });

  const neighborhoodBoundaryLayer = new FeatureLayer({
    url: "https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebNeighborhoods/FeatureServer/0",
    title: "Selected City Neighborhood",
    outFields: ["hood"],
    definitionExpression: "1=0",
    visible: true,
    opacity: 1,
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [70, 167, 88, 0.08],
        outline: {
          color: [70, 167, 88, 1],
          width: 3
        }
      }
    },
    popupEnabled: false
  });

  const councilBoundaryLayer = new FeatureLayer({
    url: "https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/CouncilDistricts2022/FeatureServer/0",
    title: "Selected Council District",
    outFields: ["DIST_ID", "DIST_NAME"],
    definitionExpression: "1=0",
    visible: true,
    opacity: 1,
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [240, 194, 75, 0.1],
        outline: {
          color: [158, 116, 17, 1],
          width: 3
        }
      }
    },
    popupEnabled: false
  });

  const map = new Map({
    basemap: "topo-vector",
    layers: [
      parcelLayer,
      ownershipReferenceLayer,
      countyParcelReferenceLayer,
      neighborhoodBoundaryLayer,
      councilBoundaryLayer,
      zipBoundaryLayer
    ]
  });

  const view = new MapView({
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

  let selectedAreaKey = null;
  let parcelLayerView = null;
  let ownershipReferenceLayerView = null;

  view.ui.add(new Home({ view }), "top-left");
  view.ui.add(new Search({ view, includeDefaultSources: true }), "top-right");
  view.ui.add(new BasemapToggle({ view, nextBasemap: "satellite" }), "bottom-right");

  const legend = new Legend({
    view,
    layerInfos: [{ layer: parcelLayer, title: "Prior-year history" }]
  });
  view.ui.add(new Expand({ view, content: legend, expanded: false, expandTooltip: "Legend" }), "top-left");

  renderMapLegend();
  renderFilters(parcelLayer, () => {
    ownershipReferenceLayer.definitionExpression = buildOwnershipReferenceWhereClause();
  });

  function isDefaultResidentialUseView() {
    return activeUseGroups.size === defaultUseGroups.length
      && defaultUseGroups.every((group) => activeUseGroups.has(group));
  }

  function expandUseFilterForOwnership() {
    if (!isDefaultResidentialUseView()) return;
    activeUseGroups.clear();
    useGroups.forEach((group) => activeUseGroups.add(group.value));
    syncFilterCheckboxes("useGroupFilters", activeUseGroups);
    setStatus("Ownership view expanded to all property uses so public ownership patterns are visible.", false);
    setTimeout(() => setStatus("", true), 3600);
  }

  function replaceActiveValues(activeValues, items) {
    activeValues.clear();
    items.forEach((item) => activeValues.add(item.value));
  }

  function setOwnershipFocus(active) {
    replaceActiveValues(activeOwnershipGroups, active ? ownershipMapGroups : ownershipGroups);
    syncFilterCheckboxes("ownershipGroupFilters", activeOwnershipGroups);
  }

  function setRenderMode(mode) {
    if (currentRenderMode === mode) return;
    const isOwnershipMode = mode === "ownership";
    setOwnershipFocus(isOwnershipMode);
    currentRenderMode = mode;
    parcelLayer.visible = !isOwnershipMode;
    ownershipReferenceLayer.visible = isOwnershipMode;
    countyParcelReferenceLayer.visible = isOwnershipMode;
    parcelLayer.renderer = isOwnershipMode ? ownershipRenderer : priorRenderer;
    parcelLayer.labelingInfo = isOwnershipMode ? ownershipLabelingInfo : null;
    parcelLayer.labelsVisible = isOwnershipMode;
    parcelLayer.definitionExpression = buildWhereClause();
    ownershipReferenceLayer.definitionExpression = buildOwnershipReferenceWhereClause();
    legend.layerInfos = [{
      layer: isOwnershipMode ? ownershipReferenceLayer : parcelLayer,
      title: isOwnershipMode ? "Ownership / Control" : "Prior-year history"
    }];
    renderMapLegend(mode);
  }

  handleModuleChange = (moduleName) => {
    if (moduleName === "ownership" || moduleName === "public-property") {
      setRenderMode("ownership");
      setStatus("Ownership reference layer active.", false);
      setTimeout(() => setStatus("", true), 2400);
      return;
    }
    setRenderMode("prior");
  };

  handleModuleChange(currentModule);

  const boundaryConfigs = {
    zip: {
      layer: zipBoundaryLayer,
      field: "ZCTA5",
      outFields: ["ZCTA5"],
      label: "ZIP boundary"
    },
    neighborhood: {
      layer: neighborhoodBoundaryLayer,
      field: "hood",
      outFields: ["hood"],
      label: "neighborhood boundary"
    },
    council: {
      layer: councilBoundaryLayer,
      field: "DIST_NAME",
      outFields: ["DIST_ID", "DIST_NAME"],
      label: "Council district boundary"
    }
  };

  view.whenLayerView(parcelLayer).then((layerView) => {
    parcelLayerView = layerView;
  });
  view.whenLayerView(ownershipReferenceLayer).then((layerView) => {
    ownershipReferenceLayerView = layerView;
  });

  function clearAreaSelection() {
    selectedAreaKey = null;
    zipBoundaryLayer.definitionExpression = "1=0";
    neighborhoodBoundaryLayer.definitionExpression = "1=0";
    councilBoundaryLayer.definitionExpression = "1=0";
    areaFocusCard.classList.add("is-hidden");
    document.querySelectorAll("[data-area-type]").forEach((row) => row.classList.remove("is-active"));

    if (parcelLayerView) {
      parcelLayerView.filter = null;
    }

    if (ownershipReferenceLayerView) {
      ownershipReferenceLayerView.filter = null;
    }
  }

  document.querySelectorAll(".bookmark").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.textContent.trim() === "Citywide") clearAreaSelection();
      const center = button.dataset.center.split(",").map(Number);
      const zoom = Number(button.dataset.zoom);
      view.goTo({ center, zoom }, { duration: 750 });
    });
  });

  function sqlValue(value) {
    return String(value).replaceAll("'", "''");
  }

  function allChartItems() {
    return [...neighborhoodChartData, ...councilChartData, ...zipChartData, ...zipMedianYearsData];
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-area-type]");
    if (!button) return;

    const areaType = button.dataset.areaType;
    const boundaryValue = button.dataset.boundaryValue;
    const metric = button.dataset.metric || "count";
    const config = boundaryConfigs[areaType];
    const item = allChartItems().find((candidate) => (
      candidate.boundaryType === areaType
      && candidate.boundaryValue === boundaryValue
      && (candidate.metricId || "count") === metric
    )) || {
      label: boundaryValue,
      value: 0,
      metricLabel: "mapped parcels",
      boundaryType: areaType,
      boundaryValue
    };
    const selectionKey = `${areaType}:${boundaryValue}:${metric}`;

    if (selectedAreaKey === selectionKey && button.classList.contains("is-active")) {
      clearAreaSelection();
      setStatus(`${boundaryTypeLabel(areaType)} boundary filter cleared.`, false);
      setTimeout(() => setStatus("", true), 2500);
      return;
    }

    if (!config) return;

    selectedAreaKey = selectionKey;
    document.querySelectorAll("[data-area-type]").forEach((row) => {
      row.classList.toggle("is-active", row === button);
    });

    Object.values(boundaryConfigs).forEach((boundaryConfig) => {
      boundaryConfig.layer.definitionExpression = "1=0";
    });

    config.layer.definitionExpression = `${config.field} = '${sqlValue(boundaryValue)}'`;
    setAreaFocus(item);
    setStatus("", true);

    try {
      const query = config.layer.createQuery();
      query.where = config.layer.definitionExpression;
      query.returnGeometry = true;
      query.outFields = config.outFields;
      const result = await config.layer.queryFeatures(query);
      const feature = result.features[0];

      if (feature?.geometry?.extent) {
        if (parcelLayerView) {
          parcelLayerView.filter = {
            geometry: feature.geometry,
            spatialRelationship: "intersects"
          };
        }

        if (ownershipReferenceLayerView) {
          ownershipReferenceLayerView.filter = {
            geometry: feature.geometry,
            spatialRelationship: "intersects"
          };
        }

        await view.goTo(feature.geometry.extent.expand(1.2), { duration: 650 });
      }
    } catch (error) {
      console.error(error);
      setStatus(`Could not load the selected ${config.label}.`, false);
    }
  });

  parcelLayer.when(() => {
    setStatus("Residential view active by default. 30,259 multi-use vacant parcels are available through the use filter.", false);
    view.goTo(parcelLayer.fullExtent.expand(1.08), { duration: 600 }).catch(() => {});
    setTimeout(() => setStatus("", true), 4200);
  }).catch((error) => {
    console.error(error);
    setStatus("Map data did not load. Serve this folder through a web server and check the GeoJSON path.");
  });
});
