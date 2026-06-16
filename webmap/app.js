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

const activeBands = new Set(bands.map((band) => band.value));
const defaultUseGroups = useGroups.filter((group) => group.defaultActive).map((group) => group.value);
const activeUseGroups = new Set(defaultUseGroups);
const statusNode = document.getElementById("mapStatus");
const areaFocusCard = document.getElementById("areaFocusCard");

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
  const clauses = [
    buildInClause("use_group", activeUseGroups, useGroups),
    buildInClause("prior_band", activeBands, bands)
  ].filter(Boolean);

  return clauses.length ? clauses.join(" AND ") : "1=1";
}

function renderFilterList({ containerId, items, activeValues, onChange }) {
  const filterList = document.getElementById(containerId);
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
  document.getElementById(containerId).querySelectorAll("input").forEach((input) => {
    input.checked = activeValues.has(input.value);
  });
}

function renderFilters(layer) {
  const updateLayerFilter = () => {
    layer.definitionExpression = buildWhereClause();
  };

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

  document.getElementById("resetFilters").addEventListener("click", () => {
    activeBands.clear();
    bands.forEach((band) => activeBands.add(band.value));
    activeUseGroups.clear();
    defaultUseGroups.forEach((group) => activeUseGroups.add(group));
    syncFilterCheckboxes("bandFilters", activeBands);
    syncFilterCheckboxes("useGroupFilters", activeUseGroups);
    updateLayerFilter();
  });
}

function renderMapLegend() {
  const legend = document.getElementById("mapLegend");
  legend.innerHTML = `
    <div class="legend-heading">Prior-Year History</div>
    <div class="legend-items">
      ${bands.map((band) => `
        <div class="legend-item">
          <span class="swatch" style="background:${band.color}"></span>
          <span class="legend-label">${escapeHtml(band.label)}</span>
          <span class="legend-count">${formatNumber(band.count)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderBarChart(containerId, data) {
  const container = document.getElementById(containerId);
  const maxValue = Math.max(...data.map((item) => item.value));

  container.innerHTML = data.map((item) => {
    const percent = Math.max((item.value / maxValue) * 100, 3);
    const suffix = item.suffix ?? "";
    const valueLabel = suffix ? `${item.value.toFixed(1)}${suffix}` : formatNumber(item.value);
    const isClickable = item.boundaryType && item.boundaryValue;
    const tagName = isClickable ? "button" : "div";
    const boundaryAttrs = isClickable
      ? ` type="button" data-area-type="${escapeHtml(item.boundaryType)}" data-boundary-value="${escapeHtml(item.boundaryValue)}" data-metric="${escapeHtml(item.metricId || "count")}"`
      : "";
    const buttonClass = isClickable ? " chart-row-button" : "";

    return `
      <${tagName} class="chart-row${buttonClass}"${boundaryAttrs}>
        <div class="chart-label">${escapeHtml(item.label)}</div>
        <div class="chart-track" aria-hidden="true">
          <span class="chart-bar" style="width:${percent}%"></span>
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

renderBoundaryCharts({ neighborhoods: neighborhoodChartData, councilDistricts: councilChartData });
renderBarChart("zipChart", zipChartData);
renderBarChart("zipMedianYearsChart", zipMedianYearsData);
loadBoundaryAnalysis();

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
  const renderer = {
    type: "unique-value",
    field: "prior_band",
    defaultSymbol: {
      type: "simple-fill",
      color: [180, 188, 190, 0.7],
      outline: { color: [80, 90, 94, 0.7], width: 0.6 }
    },
    uniqueValueInfos: bands.map((band) => ({
      value: band.value,
      label: band.label,
      symbol: {
        type: "simple-fill",
        color: `${band.color}bf`,
        outline: { color: band.outline, width: 0.75 }
      }
    }))
  };

  const parcelLayer = new GeoJSONLayer({
    url: "data/vacant_land_triage.geojson",
    title: "Vacant Land Parcels",
    outFields: ["*"],
    renderer,
    definitionExpression: buildWhereClause(),
    opacity: 0.86,
    popupTemplate: {
      title: "{prior_band}",
      content: buildPopupContent
    }
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
    layers: [parcelLayer, neighborhoodBoundaryLayer, councilBoundaryLayer, zipBoundaryLayer]
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

  view.ui.add(new Home({ view }), "top-left");
  view.ui.add(new Search({ view, includeDefaultSources: true }), "top-right");
  view.ui.add(new BasemapToggle({ view, nextBasemap: "satellite" }), "bottom-right");

  const legend = new Legend({
    view,
    layerInfos: [{ layer: parcelLayer, title: "Prior-year history" }]
  });
  view.ui.add(new Expand({ view, content: legend, expanded: false, expandTooltip: "Legend" }), "top-left");

  renderMapLegend();
  renderFilters(parcelLayer);

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
