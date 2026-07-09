const APP_TITLE = "Vacant Land Redevelopment Explorer";
const LAYER_SOURCES_URL = "data/layer_sources.json?v=redevelopment-explorer-20260709k";

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
  vacantLotScore: {
    label: "Vacant lot score",
    shortLabel: "Lot score",
    helper: "Tolemi tax-sale vacant-lot score",
    field: "vacant_lot_score_band",
    chartTitle: "Vacant Lot Score Breakdown",
    categories: [
      { value: "High (75-100)", label: "High (75-100)", color: "#7a1210", outline: "#4c0908" },
      { value: "Medium (50-74)", label: "Medium (50-74)", color: "#c54036", outline: "#7d231e" },
      { value: "Low (25-49)", label: "Low (25-49)", color: "#e97827", outline: "#9b4818" },
      { value: "Very low (0-24)", label: "Very low (0-24)", color: "#f0c24b", outline: "#9f7411" },
      { value: "Not scored", label: "Not scored", color: "#c7d0d5", outline: "#65727b" }
    ]
  }
};

const highVacantLotScoreBands = new Set(["High (75-100)", "Medium (50-74)"]);

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

const TABLE_COLUMNS = [
  { key: "par_pin", label: "PIN", defaultVisible: true, exportDefault: true },
  { key: "parcel_label", label: "Parcel label", defaultVisible: true, exportDefault: true },
  { key: "propertyowner", label: "Owner", defaultVisible: true, exportDefault: true },
  { key: "project_name", label: "EPP project", defaultVisible: true, exportDefault: true },
  { key: "use_group", label: "Use group", defaultVisible: true, exportDefault: true },
  { key: "usedesc", label: "Use desc", defaultVisible: true, exportDefault: true },
  { key: "prior_band", label: "Tax delinquency", defaultVisible: true, exportDefault: true },
  { key: "prior_years", label: "Prior years", defaultVisible: true, exportDefault: true },
  { key: "taxdesc", label: "Tax status", defaultVisible: true, exportDefault: true },
  { key: "ownership_group", label: "Ownership", defaultVisible: true, exportDefault: true },
  { key: "control_path", label: "Control path", defaultVisible: true, exportDefault: true },
  { key: "vacant_lot_score_band", label: "Lot score band", defaultVisible: true, exportDefault: true },
  { key: "tax_sale_vacant_lot_score", label: "Lot score", defaultVisible: true, exportDefault: true },
  { key: "city_neighborhood", label: "Neighborhood", defaultVisible: true, exportDefault: true },
  { key: "council_district_label", label: "Council", defaultVisible: true, exportDefault: true },
  { key: "par_calcacreag", label: "Acreage", defaultVisible: true, exportDefault: true },
  { key: "fairmarkettotal", label: "FMV", defaultVisible: true, exportDefault: true },
  { key: "pli_hazard_band", label: "PLI band", defaultVisible: false, exportDefault: true },
  { key: "pli_hazard_score", label: "PLI score", defaultVisible: false, exportDefault: true },
  { key: "condemned_flag", label: "Condemned flag", defaultVisible: false, exportDefault: true },
  { key: "council_district", label: "Council ID", defaultVisible: false, exportDefault: false },
  { key: "centroid_lat", label: "Lat", defaultVisible: false, exportDefault: true },
  { key: "centroid_lng", label: "Lon", defaultVisible: false, exportDefault: true }
];

const TABLE_FILTER_FIELDS = [
  { key: "use_group", label: "Property Use" },
  { key: "ownership_group", label: "Ownership" },
  { key: "prior_band", label: "Tax delinquency" },
  { key: "vacant_lot_score_band", label: "Lot score" },
  { key: "project_name", label: "EPP project" },
  { key: "pli_hazard_band", label: "PLI hazard" },
  { key: "city_neighborhood", label: "Neighborhood" },
  { key: "council_district_label", label: "Council" }
];

const PIN_COLUMN_CANDIDATES = [
  "parcel_id",
  "par_pin",
  "pin",
  "parcelid",
  "parcel id",
  "pid",
  "parid",
  "parcel_pin",
  "parcelpin",
  "mapblocklot",
  "mapblocklo"
];

const PDF_SIDE_SECTIONS = [
  { key: "metrics", label: "Summary metrics", defaultOn: true },
  { key: "filters", label: "Active filters", defaultOn: true },
  { key: "legend", label: "Map legend", defaultOn: true },
  { key: "topAreas", label: "Top areas", defaultOn: true },
  { key: "source", label: "Source / caveat note", defaultOn: true }
];

const PDF_METRIC_ITEMS = [
  { key: "visible", label: "Visible parcels", defaultOn: true },
  { key: "longDelinquency", label: "11+ prior years", defaultOn: true },
  { key: "publicControl", label: "Public/control", defaultOn: true },
  { key: "highVacantLotScore", label: "High lot score", defaultOn: true },
  { key: "neighborhoods", label: "Neighborhoods represented", defaultOn: false },
  { key: "cityOwned", label: "City owned", defaultOn: false },
  { key: "uraOwned", label: "URA owned", defaultOn: false },
  { key: "acreage", label: "Total acreage", defaultOn: false }
];

const state = {
  viewMode: "map",
  signalMode: "tax",
  activeUseGroups: new Set(),
  activeSignalValues: {
    tax: new Set(signalModes.tax.categories.map((item) => item.value)),
    ownership: new Set(signalModes.ownership.categories.map((item) => item.value)),
    vacantLotScore: new Set(signalModes.vacantLotScore.categories.map((item) => item.value))
  },
  customList: null,
  checkedExportPins: null,
  pendingPdfOptions: null
};

const tableState = {
  search: "",
  filters: Object.fromEntries(TABLE_FILTER_FIELDS.map((item) => [item.key, new Set()])),
  visibleColumns: new Set(TABLE_COLUMNS.filter((item) => item.defaultVisible).map((item) => item.key)),
  exportColumns: new Set(TABLE_COLUMNS.filter((item) => item.exportDefault).map((item) => item.key)),
  checkedPins: new Set(),
  pdfSections: new Set(PDF_SIDE_SECTIONS.filter((item) => item.defaultOn).map((item) => item.key)),
  pdfMetrics: new Set(PDF_METRIC_ITEMS.filter((item) => item.defaultOn).map((item) => item.key)),
  sortKey: "par_pin",
  sortDir: "asc",
  page: 1,
  pageSize: 250
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
  exportXlsxButton: document.getElementById("exportXlsxButton"),
  customListButton: document.getElementById("customListButton"),
  clearCustomListButton: document.getElementById("clearCustomListButton"),
  customListBanner: document.getElementById("customListBanner"),
  customListModal: document.getElementById("customListModal"),
  customListFileInput: document.getElementById("customListFileInput"),
  customListSheetLabel: document.getElementById("customListSheetLabel"),
  customListSheetSelect: document.getElementById("customListSheetSelect"),
  customListPinLabel: document.getElementById("customListPinLabel"),
  customListPinSelect: document.getElementById("customListPinSelect"),
  customListPreview: document.getElementById("customListPreview"),
  applyCustomListButton: document.getElementById("applyCustomListButton"),
  resetFilters: document.getElementById("resetFilters"),
  visibleParcelMetric: document.getElementById("visibleParcelMetric"),
  longDelinquencyMetric: document.getElementById("longDelinquencyMetric"),
  publicControlMetric: document.getElementById("publicControlMetric"),
  vacantLotScoreMetric: document.getElementById("vacantLotScoreMetric"),
  signalChartTitle: document.getElementById("signalChartTitle"),
  signalChart: document.getElementById("signalChart"),
  areaChart: document.getElementById("areaChart"),
  reviewTableBody: document.getElementById("reviewTableBody"),
  mapView: document.getElementById("mapView"),
  tableView: document.getElementById("tableView"),
  tableRowCount: document.getElementById("tableRowCount"),
  tableSearchInput: document.getElementById("tableSearchInput"),
  tableClearFilters: document.getElementById("tableClearFilters"),
  tableColumnsButton: document.getElementById("tableColumnsButton"),
  tableExportButton: document.getElementById("tableExportButton"),
  tableExportCheckedPdfButton: document.getElementById("tableExportCheckedPdfButton"),
  tableSelectPageButton: document.getElementById("tableSelectPageButton"),
  tableClearCheckedButton: document.getElementById("tableClearCheckedButton"),
  tableCheckedCount: document.getElementById("tableCheckedCount"),
  tableFilterBar: document.getElementById("tableFilterBar"),
  spreadsheetHead: document.getElementById("spreadsheetHead"),
  spreadsheetBody: document.getElementById("spreadsheetBody"),
  tablePrevPage: document.getElementById("tablePrevPage"),
  tableNextPage: document.getElementById("tableNextPage"),
  tablePageLabel: document.getElementById("tablePageLabel"),
  tablePageSize: document.getElementById("tablePageSize"),
  columnPickerModal: document.getElementById("columnPickerModal"),
  columnPickerList: document.getElementById("columnPickerList"),
  columnPickerSelectAll: document.getElementById("columnPickerSelectAll"),
  columnPickerSelectNone: document.getElementById("columnPickerSelectNone"),
  exportColumnsModal: document.getElementById("exportColumnsModal"),
  exportColumnsList: document.getElementById("exportColumnsList"),
  exportColumnsSelectAll: document.getElementById("exportColumnsSelectAll"),
  exportColumnsSelectNone: document.getElementById("exportColumnsSelectNone"),
  confirmExportXlsx: document.getElementById("confirmExportXlsx"),
  pdfOptionsModal: document.getElementById("pdfOptionsModal"),
  pdfMetricsList: document.getElementById("pdfMetricsList"),
  pdfMetricsSelectAll: document.getElementById("pdfMetricsSelectAll"),
  pdfMetricsSelectNone: document.getElementById("pdfMetricsSelectNone"),
  confirmExportPdf: document.getElementById("confirmExportPdf")
};

let allFeatures = [];
let useGroupItems = [];
let layerSources = null;
let parcelDataSource = "geojson";
let view = null;
let parcelLayer = null;
let parcelLayerView = null;
let reactiveUtilsRef = null;
let locationToAddressRef = null;
let customListWorkbook = null;
let customListDraft = null;

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

function normalizePin(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\.0+$/, "")
    .replace(/[^A-Z0-9]/g, "");
}

function getProp(feature, field) {
  return feature?.properties?.[field] ?? feature?.[field];
}

function featurePin(feature) {
  return normalizePin(getProp(feature, "par_pin") || getProp(feature, "parcel_label"));
}

function buildParcelPinIndex() {
  const index = new Map();
  allFeatures.forEach((feature) => {
    const pin = featurePin(feature);
    if (!pin) return;
    if (!index.has(pin)) index.set(pin, []);
    index.get(pin).push(feature);
  });
  return index;
}

function guessPinColumn(headers) {
  const normalized = headers.map((header) => ({
    header,
    key: String(header ?? "").trim().toLowerCase().replace(/[\s_]+/g, "_")
  }));
  for (const candidate of PIN_COLUMN_CANDIDATES) {
    const key = candidate.replace(/[\s_]+/g, "_");
    const match = normalized.find((item) => item.key === key || item.key.includes(key));
    if (match) return match.header;
  }
  return headers[0] || "";
}

function rowsFromSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
}

function extractPinsFromRows(rows, pinColumn) {
  const pins = [];
  const seen = new Set();
  rows.forEach((row) => {
    const pin = normalizePin(row?.[pinColumn]);
    if (!pin || seen.has(pin)) return;
    seen.add(pin);
    pins.push(pin);
  });
  return pins;
}

function joinCustomListPins(pins) {
  const index = buildParcelPinIndex();
  const matchedPins = [];
  const unmatchedPins = [];
  pins.forEach((pin) => {
    if (index.has(pin)) matchedPins.push(pin);
    else unmatchedPins.push(pin);
  });
  return { matchedPins, unmatchedPins, matchedCount: matchedPins.length, uploadCount: pins.length };
}

function setCustomListPreview(message, tone = "") {
  if (!nodes.customListPreview) return;
  nodes.customListPreview.textContent = message;
  nodes.customListPreview.classList.toggle("is-error", tone === "error");
  nodes.customListPreview.classList.toggle("is-ready", tone === "ready");
}

function updateCustomListUi() {
  const active = Boolean(state.customList?.matchedPins?.length);
  if (nodes.clearCustomListButton) {
    nodes.clearCustomListButton.classList.toggle("is-hidden", !active);
  }
  if (nodes.customListBanner) {
    nodes.customListBanner.classList.toggle("is-hidden", !active);
    if (active) {
      const list = state.customList;
      nodes.customListBanner.innerHTML = `
        <strong>Custom list active: ${escapeHtml(list.fileName)}</strong>
        Inner join ${formatNumber(list.matchedCount)} of ${formatNumber(list.uploadCount)} uploaded PINs
        ${list.unmatchedCount ? ` · ${formatNumber(list.unmatchedCount)} not in vacant-land layer` : ""}
        · Colors follow Map Signal · Export PDF for paper GIS
      `;
    } else {
      nodes.customListBanner.textContent = "";
    }
  }
  if (nodes.customListButton) {
    nodes.customListButton.classList.toggle("is-active-list", active);
  }
}

function clearCustomList(refresh = true) {
  state.customList = null;
  customListWorkbook = null;
  customListDraft = null;
  if (nodes.customListFileInput) nodes.customListFileInput.value = "";
  if (nodes.customListSheetLabel) nodes.customListSheetLabel.classList.add("is-hidden");
  if (nodes.customListPinLabel) nodes.customListPinLabel.classList.add("is-hidden");
  if (nodes.applyCustomListButton) nodes.applyCustomListButton.disabled = true;
  setCustomListPreview("No file selected.");
  updateCustomListUi();
  if (refresh) applyDashboardState();
}

function refreshCustomListDraftPreview() {
  if (!customListDraft) {
    if (nodes.applyCustomListButton) nodes.applyCustomListButton.disabled = true;
    return;
  }
  const pinColumn = nodes.customListPinSelect?.value || customListDraft.pinColumn;
  const sheetName = nodes.customListSheetSelect?.value || customListDraft.sheetName;
  const rows = customListWorkbook
    ? rowsFromSheet(customListWorkbook, sheetName)
    : customListDraft.rows || [];
  const pins = extractPinsFromRows(rows, pinColumn);
  const join = joinCustomListPins(pins);
  customListDraft = {
    ...customListDraft,
    sheetName,
    pinColumn,
    rows,
    pins,
    ...join,
    unmatchedCount: join.unmatchedPins.length
  };

  if (!pins.length) {
    setCustomListPreview("No PIN values found in the selected column.", "error");
    if (nodes.applyCustomListButton) nodes.applyCustomListButton.disabled = true;
    return;
  }
  if (!join.matchedCount) {
    setCustomListPreview(
      `Found ${formatNumber(pins.length)} unique PINs, but none match the vacant-land layer.\nCheck the PIN column or whether these parcels are vacant land in the app.`,
      "error"
    );
    if (nodes.applyCustomListButton) nodes.applyCustomListButton.disabled = true;
    return;
  }

  setCustomListPreview(
    [
      `File: ${customListDraft.fileName}`,
      `Sheet: ${sheetName}`,
      `PIN column: ${pinColumn}`,
      `Unique PINs: ${formatNumber(pins.length)}`,
      `Inner join matches: ${formatNumber(join.matchedCount)}`,
      join.unmatchedPins.length
        ? `Not in vacant-land layer: ${formatNumber(join.unmatchedPins.length)} (example: ${join.unmatchedPins.slice(0, 3).join(", ")})`
        : "All uploaded PINs matched."
    ].join("\n"),
    "ready"
  );
  if (nodes.applyCustomListButton) nodes.applyCustomListButton.disabled = false;
}

async function loadCustomListFile(file) {
  if (!file) return;
  if (typeof XLSX === "undefined") {
    setCustomListPreview("Spreadsheet library failed to load. Refresh and try again.", "error");
    return;
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  customListWorkbook = workbook;
  const sheetNames = workbook.SheetNames || [];
  if (!sheetNames.length) {
    setCustomListPreview("No sheets found in this workbook.", "error");
    if (nodes.applyCustomListButton) nodes.applyCustomListButton.disabled = true;
    return;
  }

  const preferredSheet = sheetNames.find((name) => /parcel|pin|membership|list/i.test(name)) || sheetNames[0];
  const rows = rowsFromSheet(workbook, preferredSheet);
  const headers = rows.length ? Object.keys(rows[0]) : [];
  if (!headers.length) {
    setCustomListPreview(`Sheet "${preferredSheet}" has no data rows.`, "error");
    if (nodes.applyCustomListButton) nodes.applyCustomListButton.disabled = true;
    return;
  }

  const pinColumn = guessPinColumn(headers);
  customListDraft = {
    fileName: file.name,
    sheetName: preferredSheet,
    pinColumn,
    headers,
    rows
  };

  if (nodes.customListSheetSelect) {
    nodes.customListSheetSelect.innerHTML = sheetNames
      .map((name) => `<option value="${escapeHtml(name)}" ${name === preferredSheet ? "selected" : ""}>${escapeHtml(name)}</option>`)
      .join("");
    nodes.customListSheetLabel?.classList.toggle("is-hidden", sheetNames.length <= 1);
  }
  if (nodes.customListPinSelect) {
    nodes.customListPinSelect.innerHTML = headers
      .map((header) => `<option value="${escapeHtml(header)}" ${header === pinColumn ? "selected" : ""}>${escapeHtml(header)}</option>`)
      .join("");
    nodes.customListPinLabel?.classList.remove("is-hidden");
  }

  refreshCustomListDraftPreview();
}

function expandFiltersForCustomList(matchedPinSet) {
  // Show every joined parcel; default Residential/Commercial-only would hide many list rows.
  const matchedFeatures = allFeatures.filter((feature) => matchedPinSet.has(featurePin(feature)));
  const useGroups = new Set(matchedFeatures.map((feature) => getProp(feature, "use_group") || "Not recorded"));
  useGroups.forEach((value) => state.activeUseGroups.add(value));

  Object.keys(signalModes).forEach((modeName) => {
    const values = new Set(matchedFeatures.map((feature) => signalValueForFeature(feature, modeName)));
    values.forEach((value) => state.activeSignalValues[modeName].add(value));
  });
}

function applyCustomListDraft() {
  if (!customListDraft?.matchedPins?.length) return;
  const matchedPinSet = new Set(customListDraft.matchedPins);
  state.customList = {
    fileName: customListDraft.fileName,
    sheetName: customListDraft.sheetName,
    pinColumn: customListDraft.pinColumn,
    matchedPins: [...customListDraft.matchedPins],
    matchedPinSet,
    uploadCount: customListDraft.uploadCount,
    matchedCount: customListDraft.matchedCount,
    unmatchedCount: customListDraft.unmatchedCount,
    unmatchedPins: customListDraft.unmatchedPins.slice(0, 50)
  };
  expandFiltersForCustomList(matchedPinSet);
  closeModal(nodes.customListModal);
  updateCustomListUi();
  setViewMode("map");
  applyDashboardState();
  zoomToCustomList().catch(() => {});
  if (nodes.exportStatus) {
    nodes.exportStatus.textContent = `Custom list: ${formatNumber(state.customList.matchedCount)} parcels on map`;
    window.setTimeout(() => {
      if (nodes.exportStatus) nodes.exportStatus.textContent = "";
    }, 4000);
  }
}

async function zoomToPins(pins) {
  if (!view || !parcelLayer || !pins?.length) return;
  const chunkSize = 900;
  let extent = null;
  for (let i = 0; i < pins.length; i += chunkSize) {
    const chunk = pins.slice(i, i + chunkSize);
    const where = `par_pin IN (${chunk.map((pin) => `'${sqlEscape(pin)}'`).join(",")})`;
    const result = await parcelLayer.queryExtent({ where });
    if (!result?.extent) continue;
    extent = extent ? extent.union(result.extent) : result.extent.clone();
  }
  if (extent) {
    await view.goTo(extent.expand(1.2), { duration: 700 });
  }
}

async function zoomToCustomList() {
  if (!state.customList?.matchedPins?.length) return;
  await zoomToPins(state.customList.matchedPins);
}

function renderPdfOptionsChecklist() {
  if (!nodes.pdfMetricsList) return;
  const sectionHtml = `
    <div class="pdf-options-group">
      <strong>Side panel sections</strong>
      ${PDF_SIDE_SECTIONS.map((item) => `
        <label>
          <input type="checkbox" data-pdf-section="${escapeHtml(item.key)}" ${tableState.pdfSections.has(item.key) ? "checked" : ""} />
          <span>${escapeHtml(item.label)}</span>
        </label>
      `).join("")}
    </div>
  `;
  const metricsHtml = `
    <div class="pdf-options-group">
      <strong>Summary metrics</strong>
      ${PDF_METRIC_ITEMS.map((item) => `
        <label>
          <input type="checkbox" data-pdf-metric="${escapeHtml(item.key)}" ${tableState.pdfMetrics.has(item.key) ? "checked" : ""} />
          <span>${escapeHtml(item.label)}</span>
        </label>
      `).join("")}
    </div>
  `;
  nodes.pdfMetricsList.innerHTML = `${sectionHtml}${metricsHtml}`;

  nodes.pdfMetricsList.querySelectorAll("input[data-pdf-section]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) tableState.pdfSections.add(input.dataset.pdfSection);
      else tableState.pdfSections.delete(input.dataset.pdfSection);
    });
  });
  nodes.pdfMetricsList.querySelectorAll("input[data-pdf-metric]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) tableState.pdfMetrics.add(input.dataset.pdfMetric);
      else tableState.pdfMetrics.delete(input.dataset.pdfMetric);
    });
  });
}

function openPdfOptionsModal(options = {}) {
  const checkedOnly = Boolean(options.checkedOnly);
  if (checkedOnly && !tableState.checkedPins.size) {
    if (nodes.exportStatus) nodes.exportStatus.textContent = "Check at least one parcel in the table first.";
    return;
  }
  if (!view) {
    if (nodes.exportStatus) nodes.exportStatus.textContent = "Wait for the map to finish loading.";
    return;
  }
  state.pendingPdfOptions = { checkedOnly };
  renderPdfOptionsChecklist();
  openModal(nodes.pdfOptionsModal);
}

async function exportCurrentMapPdf(options = {}) {
  const checkedOnly = Boolean(options.checkedOnly);
  const checkedPins = checkedOnly ? [...tableState.checkedPins] : [];
  if (checkedOnly && !checkedPins.length) {
    if (nodes.exportStatus) nodes.exportStatus.textContent = "Check at least one parcel in the table first.";
    return;
  }

  const selectedSections = new Set(tableState.pdfSections);
  const selectedMetrics = new Set(tableState.pdfMetrics);
  if (selectedSections.has("metrics") && !selectedMetrics.size) {
    if (nodes.exportStatus) nodes.exportStatus.textContent = "Select at least one summary metric, or turn off Summary metrics.";
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    nodes.exportStatus.textContent = "Export blocked. Allow pop-ups and try again.";
    return;
  }

  const triggerButton = checkedOnly ? nodes.tableExportCheckedPdfButton : nodes.exportPdfButton;
  const previousLabel = triggerButton?.textContent || "Export PDF";
  if (triggerButton) {
    triggerButton.disabled = true;
    triggerButton.textContent = "Preparing";
  }
  nodes.exportStatus.textContent = checkedOnly
    ? `Preparing checked-parcel paper GIS (${formatNumber(checkedPins.length)})`
    : "Preparing paper GIS from current map view";
  printWindow.document.write(buildPreparingPrintHtml());
  printWindow.document.close();

  const previousViewMode = state.viewMode;
  try {
    if (checkedOnly) {
      state.checkedExportPins = new Set(checkedPins);
      setViewMode("map");
      applyLayerState();
      // Keep the user's current zoom/extent; only wait for checked parcels to redraw.
      if (reactiveUtilsRef && parcelLayerView) {
        await reactiveUtilsRef.whenOnce(() => !parcelLayerView.updating);
      }
    }

    const features = filteredFeatures();
    const stats = exportStats(features);
    const mapCapture = await captureMapImage();
    printWindow.document.open();
    printWindow.document.write(buildPrintHtml(mapCapture.dataUrl, stats, {
      scale: mapCapture.scale,
      sections: selectedSections,
      metrics: selectedMetrics,
      checkedOnly
    }));
    printWindow.document.close();
    nodes.exportStatus.textContent = "Print layout opened. Choose Save as PDF.";
    window.setTimeout(() => {
      nodes.exportStatus.textContent = "";
    }, 4500);
  } catch (error) {
    console.error(error);
    nodes.exportStatus.textContent = "Export failed. Try again after the map finishes loading.";
  } finally {
    if (checkedOnly) {
      state.checkedExportPins = null;
      applyLayerState();
      if (previousViewMode === "table") setViewMode("table");
      updateCheckedSelectionUi();
    }
    if (triggerButton) {
      triggerButton.disabled = checkedOnly ? tableState.checkedPins.size === 0 : false;
      triggerButton.textContent = previousLabel;
    }
  }
}

function isDashboardParcel(feature) {
  const useGroup = getProp(feature, "use_group");
  const useDesc = String(getProp(feature, "usedesc") || "").trim().toUpperCase();
  return !excludedDashboardUseGroups.has(useGroup) && !excludedDashboardUses.has(useDesc);
}

function countBy(features, field) {
  const counts = new Map();
  features.forEach((feature) => {
    let value = getProp(feature, field);
    if (value === null || value === undefined || value === "") {
      value = field === "vacant_lot_score_band" || field === "pli_hazard_band" ? "Not scored" : "Not recorded";
    }
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
  const values = new Set([...preferredUseOrder.filter((value) => counts.has(value)), ...counts.keys()]);
  // Keep known dashboard use groups even if a bad ArcGIS source returns blanks.
  preferredUseOrder.forEach((value) => {
    if (!excludedDashboardUseGroups.has(value)) values.add(value);
  });
  values.delete("Not recorded");
  const ordered = sortByPreferred(values, preferredUseOrder).filter((value) => value !== "Not recorded");
  return ordered.map((value) => ({
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

function signalValueForFeature(feature, modeName = state.signalMode) {
  const props = feature.properties || feature;
  const mode = signalModes[modeName];
  const raw = props[mode.field];
  if (raw === null || raw === undefined || raw === "") {
    return modeName === "vacantLotScore" || modeName === "pliHazard" ? "Not scored" : "Not recorded";
  }
  return raw;
}

function featureMatchesActiveFilters(feature) {
  const props = feature.properties || feature;
  if (state.customList?.matchedPinSet?.size) {
    const pin = featurePin(feature);
    if (!state.customList.matchedPinSet.has(pin)) return false;
  }
  if (state.checkedExportPins?.size) {
    const pin = featurePin(feature);
    if (!state.checkedExportPins.has(pin)) return false;
  }

  const useGroup = props.use_group || "Not recorded";
  if (!state.activeUseGroups.has(useGroup)) return false;

  const signalValue = signalValueForFeature(feature);
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

function buildCustomListPinClause() {
  const pins = state.checkedExportPins?.size
    ? [...state.checkedExportPins]
    : state.customList?.matchedPins;
  if (!pins?.length) return null;
  // ArcGIS where clauses can get large; chunk with OR groups.
  const chunkSize = 900;
  const groups = [];
  for (let i = 0; i < pins.length; i += chunkSize) {
    const chunk = pins.slice(i, i + chunkSize);
    groups.push(`par_pin IN (${chunk.map((pin) => `'${sqlEscape(pin)}'`).join(",")})`);
  }
  return groups.length === 1 ? groups[0] : `(${groups.join(" OR ")})`;
}

function buildWhereClause() {
  const mode = signalModes[state.signalMode];
  const signalValues = mode.categories.map((item) => item.value);
  const clauses = [
    buildCustomListPinClause(),
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
  const highVacantLotScore = features.filter((feature) => highVacantLotScoreBands.has(getProp(feature, "vacant_lot_score_band"))).length;
  nodes.visibleParcelMetric.textContent = formatNumber(features.length);
  nodes.longDelinquencyMetric.textContent = formatNumber(longDelinquent);
  nodes.publicControlMetric.textContent = formatNumber(publicControl);
  if (nodes.vacantLotScoreMetric) nodes.vacantLotScoreMetric.textContent = formatNumber(highVacantLotScore);
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
      rows.set(area, { area, parcels: 0, long: 0, vacantLotScore: 0 });
    }
    const row = rows.get(area);
    row.parcels += 1;
    if (props.prior_band === "11+ prior years") row.long += 1;
    if (highVacantLotScoreBands.has(props.vacant_lot_score_band)) row.vacantLotScore += 1;
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
        <td>${formatNumber(row.vacantLotScore)}</td>
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
  if (state.viewMode === "table") renderTableView();

  if (!allFeatures.length) {
    setStatus("Loading vacant land parcels...");
  } else if (!features.length) {
    setStatus(
      state.customList
        ? "Custom list is active, but no joined parcels match the current Property Use / Map Signal filters."
        : "No parcels match the current filters."
    );
  } else {
    setStatus("", true);
  }
}

function setViewMode(mode) {
  state.viewMode = mode === "table" ? "table" : "map";
  document.body.classList.toggle("is-table-view", state.viewMode === "table");
  document.querySelectorAll("[data-view-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewMode === state.viewMode);
  });
  if (nodes.exportPdfButton) nodes.exportPdfButton.classList.toggle("is-hidden", state.viewMode === "table");
  if (nodes.exportXlsxButton) nodes.exportXlsxButton.classList.toggle("is-hidden", state.viewMode !== "table");
  if (state.viewMode === "table") renderTableView();
}

function featureProps(feature) {
  return feature.properties || feature;
}

function uniqueSortedValues(features, field) {
  const values = new Set();
  features.forEach((feature) => {
    const value = getProp(feature, field);
    if (value !== null && value !== undefined && String(value).trim() !== "") values.add(String(value));
  });
  return [...values].sort((a, b) => a.localeCompare(b));
}

function tableRows() {
  const search = tableState.search.trim().toLowerCase();
  let rows = filteredFeatures().filter((feature) => {
    const props = featureProps(feature);
    return TABLE_FILTER_FIELDS.every((filter) => {
      const active = tableState.filters[filter.key];
      if (!active || active.size === 0) return true;
      const value = props[filter.key] || "Not recorded";
      return active.has(String(value));
    });
  });

  if (search) {
    rows = rows.filter((feature) => {
      const props = featureProps(feature);
      const haystack = [
        props.par_pin,
        props.parcel_label,
        props.propertyowner,
        props.project_name,
        props.city_neighborhood,
        props.usedesc
      ].map((value) => String(value || "").toLowerCase()).join(" ");
      return haystack.includes(search);
    });
  }

  const sortKey = tableState.sortKey;
  const direction = tableState.sortDir === "desc" ? -1 : 1;
  rows.sort((a, b) => {
    const av = featureProps(a)[sortKey];
    const bv = featureProps(b)[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
    return String(av).localeCompare(String(bv), undefined, { numeric: true }) * direction;
  });
  return rows;
}

function formatTableCell(key, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "fairmarkettotal") return formatMoney(value);
  if (key === "par_calcacreag") return formatAcreage(value);
  return String(value);
}

function renderTableFilterBar() {
  if (!nodes.tableFilterBar) return;
  const base = filteredFeatures();
  nodes.tableFilterBar.innerHTML = TABLE_FILTER_FIELDS.map((filter) => {
    const options = uniqueSortedValues(base, filter.key);
    const active = tableState.filters[filter.key];
    const selected = active.size === 1 ? [...active][0] : "";
    return `
      <label class="table-filter-group">
        <span>${escapeHtml(filter.label)}</span>
        <select data-table-filter="${escapeHtml(filter.key)}">
          <option value="">All</option>
          ${options.map((value) => `
            <option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(value)}</option>
          `).join("")}
        </select>
      </label>
    `;
  }).join("");

  nodes.tableFilterBar.querySelectorAll("select[data-table-filter]").forEach((select) => {
    select.addEventListener("change", () => {
      const key = select.dataset.tableFilter;
      tableState.filters[key] = select.value ? new Set([select.value]) : new Set();
      tableState.page = 1;
      renderTableView();
    });
  });
}

function formatTaxDelinquency(attrs) {
  const band = attrs?.prior_band || "No known prior years";
  const years = attrs?.prior_years;
  const yearsText = years === null || years === undefined || years === ""
    ? "years not recorded"
    : `${years} prior year${Number(years) === 1 ? "" : "s"}`;
  return `${band} (${yearsText})`;
}

function updateCheckedSelectionUi() {
  const count = tableState.checkedPins.size;
  if (nodes.tableCheckedCount) {
    nodes.tableCheckedCount.textContent = count
      ? `${formatNumber(count)} checked`
      : "0 checked";
  }
  if (nodes.tableExportCheckedPdfButton) {
    nodes.tableExportCheckedPdfButton.disabled = count === 0;
  }
  if (nodes.tableClearCheckedButton) {
    nodes.tableClearCheckedButton.disabled = count === 0;
  }
}

function clearCheckedParcels() {
  tableState.checkedPins.clear();
  updateCheckedSelectionUi();
  if (state.viewMode === "table") renderSpreadsheet();
}

function selectVisiblePageRows() {
  const rows = tableRows();
  const start = (tableState.page - 1) * tableState.pageSize;
  const pageRows = rows.slice(start, start + tableState.pageSize);
  pageRows.forEach((feature) => {
    const pin = featurePin(feature);
    if (pin) tableState.checkedPins.add(pin);
  });
  updateCheckedSelectionUi();
  renderSpreadsheet();
}

function renderSpreadsheet() {
  if (!nodes.spreadsheetHead || !nodes.spreadsheetBody) return;
  const columns = TABLE_COLUMNS.filter((column) => tableState.visibleColumns.has(column.key));
  const rows = tableRows();
  const pageCount = Math.max(1, Math.ceil(rows.length / tableState.pageSize));
  tableState.page = Math.min(Math.max(1, tableState.page), pageCount);
  const start = (tableState.page - 1) * tableState.pageSize;
  const pageRows = rows.slice(start, start + tableState.pageSize);
  const pagePins = pageRows.map((feature) => featurePin(feature)).filter(Boolean);
  const allPageChecked = pagePins.length > 0 && pagePins.every((pin) => tableState.checkedPins.has(pin));

  if (nodes.tableRowCount) {
    nodes.tableRowCount.textContent = `${formatNumber(rows.length)} parcels`;
  }
  if (nodes.tablePageLabel) {
    nodes.tablePageLabel.textContent = `Page ${tableState.page} of ${pageCount}`;
  }
  if (nodes.tablePrevPage) nodes.tablePrevPage.disabled = tableState.page <= 1;
  if (nodes.tableNextPage) nodes.tableNextPage.disabled = tableState.page >= pageCount;
  updateCheckedSelectionUi();

  nodes.spreadsheetHead.innerHTML = `<tr>
    <th class="check-col" scope="col">
      <label class="row-check" title="Select all on this page">
        <input type="checkbox" id="tableSelectAllPage" ${allPageChecked ? "checked" : ""} ${pagePins.length ? "" : "disabled"} />
        <span class="visually-hidden">Select page</span>
      </label>
    </th>
    ${columns.map((column) => {
      const marker = tableState.sortKey === column.key ? (tableState.sortDir === "asc" ? " ▲" : " ▼") : "";
      return `<th data-sort-key="${escapeHtml(column.key)}">${escapeHtml(column.label)}${marker}</th>`;
    }).join("")}
  </tr>`;

  nodes.spreadsheetBody.innerHTML = pageRows.length
    ? pageRows.map((feature) => {
      const props = featureProps(feature);
      const pin = featurePin(feature);
      const checked = pin && tableState.checkedPins.has(pin) ? "checked" : "";
      return `<tr data-pin="${escapeHtml(pin)}">
        <td class="check-col">
          <label class="row-check">
            <input type="checkbox" data-row-check="${escapeHtml(pin)}" ${checked} ${pin ? "" : "disabled"} />
            <span class="visually-hidden">Select ${escapeHtml(pin || "parcel")}</span>
          </label>
        </td>
        ${columns.map((column) => `
          <td title="${escapeHtml(formatTableCell(column.key, props[column.key]))}">${escapeHtml(formatTableCell(column.key, props[column.key]))}</td>
        `).join("")}
      </tr>`;
    }).join("")
    : `<tr><td colspan="${Math.max(columns.length + 1, 2)}">No parcels match the current map and table filters.</td></tr>`;

  const selectAll = document.getElementById("tableSelectAllPage");
  if (selectAll) {
    selectAll.addEventListener("change", () => {
      pagePins.forEach((pin) => {
        if (selectAll.checked) tableState.checkedPins.add(pin);
        else tableState.checkedPins.delete(pin);
      });
      updateCheckedSelectionUi();
      renderSpreadsheet();
    });
  }

  nodes.spreadsheetBody.querySelectorAll("input[data-row-check]").forEach((input) => {
    input.addEventListener("change", () => {
      const pin = input.dataset.rowCheck;
      if (!pin) return;
      if (input.checked) tableState.checkedPins.add(pin);
      else tableState.checkedPins.delete(pin);
      updateCheckedSelectionUi();
      const header = document.getElementById("tableSelectAllPage");
      if (header) {
        header.checked = pagePins.length > 0 && pagePins.every((value) => tableState.checkedPins.has(value));
      }
    });
  });

  nodes.spreadsheetHead.querySelectorAll("th[data-sort-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sortKey;
      if (tableState.sortKey === key) {
        tableState.sortDir = tableState.sortDir === "asc" ? "desc" : "asc";
      } else {
        tableState.sortKey = key;
        tableState.sortDir = "asc";
      }
      renderSpreadsheet();
    });
  });
}

function renderChecklist(container, selectedSet) {
  if (!container) return;
  container.innerHTML = TABLE_COLUMNS.map((column) => `
    <label>
      <input type="checkbox" value="${escapeHtml(column.key)}" ${selectedSet.has(column.key) ? "checked" : ""} />
      <span>${escapeHtml(column.label)}</span>
    </label>
  `).join("");
  container.querySelectorAll("input[type=checkbox]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) selectedSet.add(input.value);
      else selectedSet.delete(input.value);
      if (container === nodes.columnPickerList) renderSpreadsheet();
    });
  });
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
}

function renderTableView() {
  renderTableFilterBar();
  renderSpreadsheet();
  renderChecklist(nodes.columnPickerList, tableState.visibleColumns);
  renderChecklist(nodes.exportColumnsList, tableState.exportColumns);
}

function clearTableFilters() {
  TABLE_FILTER_FIELDS.forEach((filter) => {
    tableState.filters[filter.key] = new Set();
  });
  tableState.search = "";
  tableState.page = 1;
  if (nodes.tableSearchInput) nodes.tableSearchInput.value = "";
  renderTableView();
}

function exportTableXlsx() {
  if (typeof XLSX === "undefined") {
    if (nodes.exportStatus) nodes.exportStatus.textContent = "XLSX library failed to load.";
    return;
  }
  const columns = TABLE_COLUMNS.filter((column) => tableState.exportColumns.has(column.key));
  if (!columns.length) {
    if (nodes.exportStatus) nodes.exportStatus.textContent = "Select at least one export column.";
    return;
  }

  const rows = tableRows().map((feature) => {
    const props = featureProps(feature);
    const row = {};
    columns.forEach((column) => {
      row[column.label] = props[column.key] ?? "";
    });
    return row;
  });

  const workbook = XLSX.utils.book_new();
  const parcelSheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, parcelSheet, "Parcels");

  const infoRows = [
    { Field: "Generated", Value: new Date().toLocaleString() },
    { Field: "App", Value: APP_TITLE },
    { Field: "Mode", Value: "Internal staff use" },
    { Field: "Map signal", Value: signalModes[state.signalMode].label },
    { Field: "Active filters", Value: activeFilterSummary().join(" | ") },
    { Field: "Custom list", Value: state.customList?.fileName || "(none)" },
    { Field: "Table search", Value: tableState.search || "(none)" },
    { Field: "Row count", Value: rows.length }
  ];
  const infoSheet = XLSX.utils.json_to_sheet(infoRows);
  XLSX.utils.book_append_sheet(workbook, infoSheet, "Export_Info");

  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  XLSX.writeFile(workbook, `vacant_land_export_${stamp}.xlsx`);
  closeModal(nodes.exportColumnsModal);
  if (nodes.exportStatus) {
    nodes.exportStatus.textContent = `Exported ${formatNumber(rows.length)} rows`;
    window.setTimeout(() => {
      if (nodes.exportStatus) nodes.exportStatus.textContent = "";
    }, 3500);
  }
}

function resetFilters() {
  state.activeUseGroups = new Set(defaultUseGroupValues());
  Object.entries(signalModes).forEach(([key, mode]) => {
    state.activeSignalValues[key] = new Set(mode.categories.map((item) => item.value));
  });
  applyDashboardState();
}

function openCustomListModal() {
  if (!allFeatures.length) {
    if (nodes.exportStatus) nodes.exportStatus.textContent = "Wait for parcels to finish loading.";
    return;
  }
  openModal(nodes.customListModal);
  if (!customListDraft) setCustomListPreview("No file selected.");
}

function formatLatLng(coords) {
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return "Not available";
  return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
}

function buildPopupContent(event) {
  const attrs = event.graphic.attributes;
  const coords = parcelLatLng(event.graphic);
  return lookupParcelAddress(coords).then((address) => `
    <dl class="popup-grid">
      <dt>Parcel</dt><dd>${escapeHtml(attrs.parcel_label || attrs.par_pin)}</dd>
      <dt>Address</dt><dd>
        ${escapeHtml(address || "Address not available")}
        <p class="popup-coords">${escapeHtml(formatLatLng(coords))}</p>
        ${buildPopupStreetViewLink(coords)}
      </dd>
      <dt>PIN</dt><dd>${escapeHtml(attrs.par_pin || "Not recorded")}</dd>
      <dt>Owner</dt><dd>${escapeHtml(attrs.propertyowner || "Not recorded")}</dd>
      <dt>EPP project</dt><dd>${escapeHtml(attrs.project_name || "Not recorded")}</dd>
      <dt>Tax delinquency</dt><dd>${escapeHtml(formatTaxDelinquency(attrs))}</dd>
      <dt>Prior years</dt><dd>${escapeHtml(attrs.prior_years ?? "No known prior years")}</dd>
      <dt>Tax status</dt><dd>${escapeHtml(attrs.taxdesc || "Not recorded")}</dd>
      <dt>Ownership</dt><dd>${escapeHtml(attrs.ownership_group)}</dd>
      <dt>Control path</dt><dd>${escapeHtml(attrs.control_path)}</dd>
      <dt>Vacant lot score</dt><dd>${escapeHtml(attrs.vacant_lot_score_band || "Not scored")}</dd>
      <dt>Lot score value</dt><dd>${escapeHtml(attrs.tax_sale_vacant_lot_score ?? "Not scored")}</dd>
      <dt>PLI hazard</dt><dd>${escapeHtml(attrs.pli_hazard_band || "Not scored")}</dd>
      <dt>Use group</dt><dd>${escapeHtml(attrs.use_group || "Not recorded")}</dd>
      <dt>Neighborhood</dt><dd>${escapeHtml(attrs.city_neighborhood || "Not recorded")}</dd>
      <dt>Council</dt><dd>${escapeHtml(attrs.council_district_label || "Not recorded")}</dd>
      <dt>Acreage</dt><dd>${formatAcreage(attrs.par_calcacreag)}</dd>
      <dt>Fair market value</dt><dd>${formatMoney(attrs.fairmarkettotal)}</dd>
    </dl>
  `);
}

function parcelCentroid(graphic) {
  if (!graphic?.geometry) return null;
  const geometry = graphic.geometry;
  if (geometry.type === "polygon" || geometry.type === "multipolygon") return geometry.centroid;
  if (geometry.type === "point") return geometry;
  return geometry.extent?.center || null;
}

function webMercatorToLatLng(x, y) {
  const lng = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return { lat, lng };
}

function parcelLatLng(graphic) {
  const point = parcelCentroid(graphic);
  if (!point) return null;

  if (Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) {
    return { lat: point.latitude, lng: point.longitude };
  }

  const x = point.x;
  const y = point.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const wkid = point.spatialReference?.wkid || point.spatialReference?.latestWkid;
  if (wkid === 4326) return { lat: y, lng: x };
  if (wkid === 3857 || wkid === 102100 || wkid === 102113 || Math.abs(x) > 180 || Math.abs(y) > 90) {
    return webMercatorToLatLng(x, y);
  }
  return { lat: y, lng: x };
}

function buildGoogleStreetViewUrl(lat, lng) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
}

function buildPopupStreetViewLink(coords) {
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return "";
  const url = buildGoogleStreetViewUrl(coords.lat, coords.lng);
  return `<p class="popup-external-links"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Street View</a></p>`;
}

async function lookupParcelAddress(coords) {
  if (!locationToAddressRef || !coords) return null;
  try {
    const result = await locationToAddressRef(REVERSE_GEOCODE_URL, {
      location: {
        type: "point",
        x: coords.lng,
        y: coords.lat,
        spatialReference: { wkid: 4326 }
      }
    });
    const address = result?.address || result;
    const street = address?.Address || address?.ShortLabel || "";
    const city = address?.City || "";
    const region = address?.RegionAbbr || address?.Region || "";
    const postal = address?.Postal || "";
    const composed = [street, [city, region].filter(Boolean).join(", "), postal]
      .filter((part) => part && String(part).trim())
      .join(", ");
    return address?.LongLabel || address?.Match_addr || composed || address?.PlaceName || null;
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
  const summary = [mode.label, useText, signalText];
  if (state.customList?.matchedCount) {
    summary.unshift(
      `Custom list: ${state.customList.fileName} (${formatNumber(state.customList.matchedCount)} joined PINs)`
    );
  }
  if (state.checkedExportPins?.size) {
    summary.unshift(`Checked parcels: ${formatNumber(state.checkedExportPins.size)}`);
  }
  return summary;
}

function exportStats(features) {
  const neighborhoods = new Set(
    features
      .map((feature) => getProp(feature, "city_neighborhood"))
      .filter((value) => value && String(value).trim() && value !== "Not recorded")
  );
  const acreage = features.reduce((sum, feature) => {
    const value = Number(getProp(feature, "par_calcacreag"));
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return {
    visible: features.length,
    longDelinquency: features.filter((feature) => getProp(feature, "prior_band") === "11+ prior years").length,
    publicControl: features.filter((feature) => publicOwnershipGroups.has(getProp(feature, "ownership_group"))).length,
    highVacantLotScore: features.filter((feature) => highVacantLotScoreBands.has(getProp(feature, "vacant_lot_score_band"))).length,
    neighborhoods: neighborhoods.size,
    cityOwned: features.filter((feature) => getProp(feature, "ownership_group") === "City Owned").length,
    uraOwned: features.filter((feature) => getProp(feature, "ownership_group") === "URA Owned").length,
    acreage,
    topAreas: groupedAreaRows(features).slice(0, 5)
  };
}

function printStatLine(label, value) {
  return `<div class="print-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function printMetricLines(stats, selectedMetrics) {
  const metricValues = {
    visible: formatNumber(stats.visible),
    longDelinquency: formatNumber(stats.longDelinquency),
    publicControl: formatNumber(stats.publicControl),
    highVacantLotScore: formatNumber(stats.highVacantLotScore),
    neighborhoods: formatNumber(stats.neighborhoods),
    cityOwned: formatNumber(stats.cityOwned),
    uraOwned: formatNumber(stats.uraOwned),
    acreage: formatAcreage(stats.acreage)
  };
  return PDF_METRIC_ITEMS
    .filter((item) => selectedMetrics.has(item.key))
    .map((item) => printStatLine(item.label, metricValues[item.key]))
    .join("");
}

function buildPreparingPrintHtml() {
  return `
    <!doctype html>
    <html>
      <head><title>Preparing ${escapeHtml(APP_TITLE)} PDF</title></head>
      <body style="font-family:Arial,sans-serif;padding:24px;color:#142935">
        <h1>Preparing paper GIS export</h1>
        <p>Capturing the current map zoom, filters, and selected side-panel details.</p>
      </body>
    </html>
  `;
}

function buildPrintHtml(mapImage, stats, options = {}) {
  const filters = activeFilterSummary();
  const timestamp = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const sections = options.sections || tableState.pdfSections;
  const metrics = options.metrics || tableState.pdfMetrics;
  const scale = Number(options.scale || 0);
  const scaleText = scale > 0 ? `Approx. scale 1:${formatNumber(Math.round(scale))}` : "Current map view";
  const logoUrl = new URL("assets/ura-logo.png", window.location.href).href;
  const subtitleParts = [
    options.checkedOnly ? `Checked parcels (${formatNumber(stats.visible)})` : null,
    state.customList ? `Custom list: ${state.customList.fileName}` : null,
    `Map signal: ${signalModes[state.signalMode].label}`,
    "Current map zoom retained"
  ].filter(Boolean);

  const sideCards = [];
  if (sections.has("metrics")) {
    sideCards.push(`
      <div class="box">
        <h2>Summary Stats</h2>
        ${printMetricLines(stats, metrics) || "<p class='muted'>No metrics selected.</p>"}
      </div>
    `);
  }
  if (sections.has("filters")) {
    sideCards.push(`
      <div class="box">
        <h2>Filters</h2>
        ${filters.map((item) => `<div class="filter-item">${escapeHtml(item)}</div>`).join("")}
      </div>
    `);
  }
  if (sections.has("legend")) {
    sideCards.push(`
      <div class="box">
        <h2>Legend: ${escapeHtml(signalColorLegendTitle())}</h2>
        ${legendItems().map((item) => `
          <div class="print-legend-row">
            <span style="background:${item.color}"></span>
            <strong>${escapeHtml(item.label)}</strong>
            <em>${formatNumber(item.count)}</em>
          </div>
        `).join("")}
      </div>
    `);
  }
  if (sections.has("topAreas")) {
    sideCards.push(`
      <div class="box">
        <h2>Top Areas</h2>
        ${stats.topAreas.map((row) => `
          <div class="area-row">
            <strong>${escapeHtml(row.area)}</strong>
            <span>${formatNumber(row.parcels)}</span>
            <span>${formatNumber(row.long)} 11+</span>
            <span>${formatNumber(row.vacantLotScore)} high lot</span>
          </div>
        `).join("") || "<p class='muted'>No parcels match the current filters.</p>"}
      </div>
    `);
  }
  if (sections.has("source")) {
    sideCards.push(`
      <div class="box source">
        <h2>Source</h2>
        <p>Vacant-land GeoJSON, tax delinquency, ownership/control, Tolemi vacant-lot scores, WPRDC PLI hazard. Screening only; confirm source records before action.</p>
      </div>
    `);
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(APP_TITLE)}</title>
    <style>
      @page { size: A3 landscape; margin: 10mm; }
      * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      body { margin: 0; background: #e8eef2; color: #111820; font-family: Arial, Helvetica, sans-serif; }
      .sheet { width: 400mm; height: 277mm; margin: 0 auto; background: #fff; border: 1px solid #b9c9d4; display: grid; grid-template-rows: 27mm 1fr 12mm; }
      header { display: grid; grid-template-columns: auto 1fr auto; gap: 8mm; align-items: center; padding: 6mm 10mm 4mm; border-bottom: 1px solid #d8e4ea; }
      .logo { width: 18mm; height: auto; display: block; }
      h1 { margin: 0; color: #00334f; font-size: 18pt; line-height: 1.05; }
      .subtitle { margin-top: 2mm; color: #586872; font-size: 9pt; font-weight: 700; }
      .brand { color: #0098d3; font-size: 16pt; font-weight: 800; letter-spacing: .02em; text-align: right; }
      main { display: grid; grid-template-columns: 1fr 82mm; gap: 6mm; padding: 6mm 8mm; min-height: 0; }
      .map-frame { position: relative; border: 1px solid #b9c9d4; background: #eef4f7; overflow: hidden; min-height: 0; }
      .map-frame img { width: 100%; height: 100%; object-fit: contain; display: block; background: #eef4f7; }
      .north { position: absolute; left: 8mm; bottom: 11mm; display: grid; place-items: center; color: #00334f; font-weight: 800; font-size: 16pt; }
      .north::before { content: ""; width: 0; height: 0; border-left: 6mm solid transparent; border-right: 6mm solid transparent; border-bottom: 18mm solid #00334f; display: block; margin-bottom: 1mm; }
      .scale { position: absolute; right: 8mm; bottom: 8mm; min-width: 42mm; color: #111820; font-size: 7pt; font-weight: 800; }
      .scale-bar { height: 4mm; border-left: 1px solid #111820; border-right: 1px solid #111820; border-bottom: 3mm solid #111820; background: #fff; margin-bottom: 1mm; }
      aside { display: grid; gap: 4mm; align-content: start; min-width: 0; overflow: hidden; }
      .box { border: 1px solid #d8e4ea; padding: 4.5mm; background: #f7fbfd; }
      .box h2 { margin: 0 0 2.5mm; color: #00334f; font-size: 9pt; text-transform: uppercase; letter-spacing: .04em; }
      .print-stat { display: grid; grid-template-columns: 1fr auto; gap: 4mm; padding: 1.8mm 0; border-bottom: 1px solid #d8e4ea; font-size: 8pt; }
      .print-stat:last-child { border-bottom: 0; }
      .print-stat span { color: #586872; font-weight: 700; }
      .print-stat strong { color: #111820; font-size: 10pt; }
      .print-legend-row { display: grid; grid-template-columns: 6mm 1fr auto; gap: 3mm; align-items: center; margin: 2.2mm 0; font-size: 8pt; }
      .print-legend-row span { width: 6mm; height: 6mm; border: 1px solid rgba(17,24,32,.32); display: inline-block; }
      .filter-item, .area-row, .muted, .source p { color: #334a56; font-size: 8pt; line-height: 1.35; margin: 0 0 2mm; }
      .area-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; gap: 2mm; }
      footer { display: flex; align-items: center; justify-content: space-between; padding: 0 10mm; color: #586872; font-size: 7.5pt; border-top: 1px solid #d8e4ea; }
      @media print { body { background: #fff; } .sheet { margin: 0; border: 0; } }
    </style>
  </head>
  <body>
    <section class="sheet">
      <header>
        <img class="logo" src="${escapeHtml(logoUrl)}" alt="URA logo" />
        <div>
          <h1>${escapeHtml(APP_TITLE)}</h1>
          <div class="subtitle">${escapeHtml(subtitleParts.join("  |  "))}</div>
        </div>
        <div class="brand">URA</div>
      </header>
      <main>
        <div class="map-frame">
          <img src="${mapImage}" alt="Current vacant land map" />
          <div class="north">N</div>
          <div class="scale"><div class="scale-bar"></div>${escapeHtml(scaleText)}</div>
        </div>
        <aside>
          ${sideCards.join("") || "<div class='box'><p class='muted'>No side-panel details selected.</p></div>"}
        </aside>
      </main>
      <footer>
        <span>Generated: ${escapeHtml(timestamp)}</span>
        <span>Urban Redevelopment Authority of Pittsburgh</span>
      </footer>
    </section>
    <script>
      async function printWhenMapImageIsReady() {
        const image = document.querySelector(".map-frame img");
        if (image && image.decode) {
          await image.decode().catch(function () {});
        }
        setTimeout(function () { window.print(); }, 650);
      }
      window.addEventListener("load", printWhenMapImageIsReady);
    </script>
  </body>
</html>`;
}

async function captureMapImage() {
  if (!view) throw new Error("Map is not ready");
  await view.when();
  if (reactiveUtilsRef && parcelLayerView) {
    await reactiveUtilsRef.whenOnce(() => !parcelLayerView.updating);
  }
  const screenshot = await view.takeScreenshot({
    width: 2200,
    height: 1450,
    format: "png"
  });
  return {
    dataUrl: screenshot.dataUrl,
    scale: view.scale
  };
}

async function loadPublicData() {
  try {
    // Always build filters/metrics from the public bundle so Property Use stays Residential/Commercial/etc.
    // Private ArcGIS items can load geometry without the enriched dashboard fields.
    allFeatures = await loadFeaturesFromGeoJsonUrl(layerSources.parcelLocalGeoJsonUrl || layerSources.parcelGeoJsonUrl);

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
  // Public GitHub Pages must not hit private org ArcGIS items (login modal + missing fields).
  // Prefer a public FeatureServer when configured; otherwise use the local public GeoJSON bundle.
  if (layerSources.parcelFeatureServiceUrl) {
    try {
      const layer = new FeatureLayer({
        url: layerSources.parcelFeatureServiceUrl,
        ...parcelLayerConfig()
      });
      await layer.load();
      return { layer, source: "feature-service" };
    } catch (error) {
      console.warn("URA ArcGIS feature service unavailable; using public GeoJSON bundle.", error);
    }
  }

  if (layerSources.preferPublicGeoJson !== false && (layerSources.parcelLocalGeoJsonUrl || layerSources.parcelGeoJsonUrl)) {
    return createParcelLayerFallback(GeoJSONLayer);
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
  const viewButton = event.target.closest("[data-view-mode]");
  if (viewButton) {
    setViewMode(viewButton.dataset.viewMode);
    return;
  }

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

  const closeModalButton = event.target.closest("[data-close-modal]");
  if (closeModalButton) {
    closeModal(document.getElementById(closeModalButton.dataset.closeModal));
  }
});

nodes.resetFilters.addEventListener("click", resetFilters);
nodes.exportPdfButton.addEventListener("click", () => openPdfOptionsModal());

if (nodes.tableExportCheckedPdfButton) {
  nodes.tableExportCheckedPdfButton.addEventListener("click", () => openPdfOptionsModal({ checkedOnly: true }));
}
if (nodes.tableSelectPageButton) {
  nodes.tableSelectPageButton.addEventListener("click", selectVisiblePageRows);
}
if (nodes.tableClearCheckedButton) {
  nodes.tableClearCheckedButton.addEventListener("click", clearCheckedParcels);
}
if (nodes.pdfMetricsSelectAll) {
  nodes.pdfMetricsSelectAll.addEventListener("click", () => {
    PDF_SIDE_SECTIONS.forEach((item) => tableState.pdfSections.add(item.key));
    PDF_METRIC_ITEMS.forEach((item) => tableState.pdfMetrics.add(item.key));
    renderPdfOptionsChecklist();
  });
}
if (nodes.pdfMetricsSelectNone) {
  nodes.pdfMetricsSelectNone.addEventListener("click", () => {
    tableState.pdfSections.clear();
    tableState.pdfMetrics.clear();
    // Keep legend on by default so the paper map still has symbology context.
    tableState.pdfSections.add("legend");
    renderPdfOptionsChecklist();
  });
}
if (nodes.confirmExportPdf) {
  nodes.confirmExportPdf.addEventListener("click", () => {
    const options = state.pendingPdfOptions || {};
    closeModal(nodes.pdfOptionsModal);
    exportCurrentMapPdf(options);
  });
}

if (nodes.customListButton) {
  nodes.customListButton.addEventListener("click", openCustomListModal);
}
if (nodes.clearCustomListButton) {
  nodes.clearCustomListButton.addEventListener("click", () => clearCustomList(true));
}
if (nodes.customListFileInput) {
  nodes.customListFileInput.addEventListener("change", async () => {
    const file = nodes.customListFileInput.files?.[0];
    if (!file) return;
    try {
      setCustomListPreview("Reading spreadsheet...");
      await loadCustomListFile(file);
    } catch (error) {
      console.error(error);
      setCustomListPreview("Could not read that file. Use XLSX or CSV with a PIN column.", "error");
      if (nodes.applyCustomListButton) nodes.applyCustomListButton.disabled = true;
    }
  });
}
if (nodes.customListSheetSelect) {
  nodes.customListSheetSelect.addEventListener("change", () => {
    if (!customListWorkbook || !customListDraft) return;
    const sheetName = nodes.customListSheetSelect.value;
    const rows = rowsFromSheet(customListWorkbook, sheetName);
    const headers = rows.length ? Object.keys(rows[0]) : [];
    customListDraft.sheetName = sheetName;
    customListDraft.headers = headers;
    customListDraft.rows = rows;
    customListDraft.pinColumn = guessPinColumn(headers);
    if (nodes.customListPinSelect) {
      nodes.customListPinSelect.innerHTML = headers
        .map((header) => `<option value="${escapeHtml(header)}" ${header === customListDraft.pinColumn ? "selected" : ""}>${escapeHtml(header)}</option>`)
        .join("");
      nodes.customListPinLabel?.classList.toggle("is-hidden", !headers.length);
    }
    refreshCustomListDraftPreview();
  });
}
if (nodes.customListPinSelect) {
  nodes.customListPinSelect.addEventListener("change", refreshCustomListDraftPreview);
}
if (nodes.applyCustomListButton) {
  nodes.applyCustomListButton.addEventListener("click", applyCustomListDraft);
}

if (nodes.exportXlsxButton) {
  nodes.exportXlsxButton.addEventListener("click", () => {
    renderChecklist(nodes.exportColumnsList, tableState.exportColumns);
    openModal(nodes.exportColumnsModal);
  });
}
if (nodes.tableExportButton) {
  nodes.tableExportButton.addEventListener("click", () => {
    renderChecklist(nodes.exportColumnsList, tableState.exportColumns);
    openModal(nodes.exportColumnsModal);
  });
}
if (nodes.tableColumnsButton) {
  nodes.tableColumnsButton.addEventListener("click", () => {
    renderChecklist(nodes.columnPickerList, tableState.visibleColumns);
    openModal(nodes.columnPickerModal);
  });
}
if (nodes.tableClearFilters) nodes.tableClearFilters.addEventListener("click", clearTableFilters);
if (nodes.tableSearchInput) {
  nodes.tableSearchInput.addEventListener("input", () => {
    tableState.search = nodes.tableSearchInput.value || "";
    tableState.page = 1;
    renderSpreadsheet();
  });
}
if (nodes.tablePrevPage) {
  nodes.tablePrevPage.addEventListener("click", () => {
    tableState.page -= 1;
    renderSpreadsheet();
  });
}
if (nodes.tableNextPage) {
  nodes.tableNextPage.addEventListener("click", () => {
    tableState.page += 1;
    renderSpreadsheet();
  });
}
if (nodes.tablePageSize) {
  nodes.tablePageSize.addEventListener("change", () => {
    tableState.pageSize = Number(nodes.tablePageSize.value) || 250;
    tableState.page = 1;
    renderSpreadsheet();
  });
}
if (nodes.columnPickerSelectAll) {
  nodes.columnPickerSelectAll.addEventListener("click", () => {
    TABLE_COLUMNS.forEach((column) => tableState.visibleColumns.add(column.key));
    renderChecklist(nodes.columnPickerList, tableState.visibleColumns);
    renderSpreadsheet();
  });
}
if (nodes.columnPickerSelectNone) {
  nodes.columnPickerSelectNone.addEventListener("click", () => {
    tableState.visibleColumns.clear();
    TABLE_COLUMNS.slice(0, 3).forEach((column) => tableState.visibleColumns.add(column.key));
    renderChecklist(nodes.columnPickerList, tableState.visibleColumns);
    renderSpreadsheet();
  });
}
if (nodes.exportColumnsSelectAll) {
  nodes.exportColumnsSelectAll.addEventListener("click", () => {
    TABLE_COLUMNS.forEach((column) => tableState.exportColumns.add(column.key));
    renderChecklist(nodes.exportColumnsList, tableState.exportColumns);
  });
}
if (nodes.exportColumnsSelectNone) {
  nodes.exportColumnsSelectNone.addEventListener("click", () => {
    tableState.exportColumns.clear();
    renderChecklist(nodes.exportColumnsList, tableState.exportColumns);
  });
}
if (nodes.confirmExportXlsx) nodes.confirmExportXlsx.addEventListener("click", exportTableXlsx);

renderSignalModeControls();
setStatus("Loading vacant land parcels...");
setViewMode("map");

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
  locationToAddressRef = locator.locationToAddress;

  async function initDashboard() {
    try {
      layerSources = await loadLayerSources();
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
