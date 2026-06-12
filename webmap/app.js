const bands = [
  {
    value: "11+ prior years",
    label: "11+ prior years",
    color: "#111820",
    outline: "#000000",
    count: 3590
  },
  {
    value: "5-10 prior years",
    label: "5-10 prior years",
    color: "#0098d3",
    outline: "#005f88",
    count: 841
  },
  {
    value: "1-4 prior years",
    label: "1-4 prior years",
    color: "#f0c24b",
    outline: "#9f7411",
    count: 1920
  },
  {
    value: "No known prior years",
    label: "No known prior years",
    color: "#c7d0d5",
    outline: "#65727b",
    count: 14137
  }
];

const activeBands = new Set(bands.map((band) => band.value));
const statusNode = document.getElementById("mapStatus");
const zipFocusCard = document.getElementById("zipFocusCard");

const neighborhoodChartData = [
  { label: "Perry South", value: 553 },
  { label: "Larimer", value: 525 },
  { label: "Hazelwood", value: 466 },
  { label: "Homewood North", value: 442 },
  { label: "Middle Hill", value: 432 },
  { label: "Homewood South", value: 416 },
  { label: "Garfield", value: 337 },
  { label: "Beltzhoover", value: 298 }
];

const zipChartData = [
  { label: "15219 - Central Pittsburgh / Hill District", zip: "15219", value: 35.3, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration" },
  { label: "15208 - Homewood / Point Breeze", zip: "15208", value: 34.4, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration" },
  { label: "15235 - Penn Hills area", zip: "15235", value: 32.6, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration" },
  { label: "15120 - Homestead area", zip: "15120", value: 27.7, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration" },
  { label: "15233 - North Side / Manchester", zip: "15233", value: 27.4, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration" },
  { label: "15214 - North Side / Observatory Hill", zip: "15214", value: 26.8, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration" },
  { label: "15221 - Wilkinsburg / East End", zip: "15221", value: 26.8, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration" },
  { label: "15207 - Hazelwood / Greenfield", zip: "15207", value: 25.0, suffix: "%", metricId: "penetration", metricLabel: "residential vacancy penetration" }
];

const zipMedianYearsData = [
  { label: "15235 - Penn Hills area", zip: "15235", value: 14.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years" },
  { label: "15221 - Wilkinsburg / East End", zip: "15221", value: 5.5, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years" },
  { label: "15219 - Central Pittsburgh / Hill District", zip: "15219", value: 0.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years" },
  { label: "15208 - Homewood / Point Breeze", zip: "15208", value: 0.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years" },
  { label: "15214 - North Side / Observatory Hill", zip: "15214", value: 0.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years" },
  { label: "15207 - Hazelwood / Greenfield", zip: "15207", value: 0.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years" },
  { label: "15212 - North Side", zip: "15212", value: 0.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years" },
  { label: "15210 - South Pittsburgh", zip: "15210", value: 0.0, suffix: " yrs", metricId: "medianPriorYears", metricLabel: "median prior years" }
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

function setZipFocus(item) {
  const suffix = item.suffix ?? "";
  const valueLabel = suffix ? `${item.value.toFixed(1)}${suffix}` : formatNumber(item.value);

  zipFocusCard.innerHTML = `
    <span class="zip-focus-kicker">ZIP focus</span>
    <strong>${escapeHtml(item.label)}</strong>
    <span>${escapeHtml(valueLabel)} ${escapeHtml(item.metricLabel)}</span>
    <em>Click the active ZIP row again or use Citywide to clear.</em>
  `;
  zipFocusCard.classList.remove("is-hidden");
}

function buildWhereClause() {
  if (activeBands.size === bands.length) return "1=1";
  if (activeBands.size === 0) return "1=0";
  const values = [...activeBands].map((value) => `'${value.replaceAll("'", "''")}'`);
  return `prior_band IN (${values.join(",")})`;
}

function renderBandFilters(layer) {
  const filterList = document.getElementById("bandFilters");
  filterList.innerHTML = "";

  bands.forEach((band) => {
    const label = document.createElement("label");
    label.className = "filter-item";
    label.innerHTML = `
      <span class="filter-left">
        <input type="checkbox" value="${escapeHtml(band.value)}" checked />
        <span class="swatch" style="background:${band.color}"></span>
        <span class="filter-label">${escapeHtml(band.label)}</span>
      </span>
      <span class="filter-count">${formatNumber(band.count)}</span>
    `;

    const input = label.querySelector("input");
    input.addEventListener("change", () => {
      if (input.checked) activeBands.add(band.value);
      else activeBands.delete(band.value);
      layer.definitionExpression = buildWhereClause();
    });

    filterList.appendChild(label);
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    activeBands.clear();
    bands.forEach((band) => activeBands.add(band.value));
    filterList.querySelectorAll("input").forEach((input) => {
      input.checked = true;
    });
    layer.definitionExpression = "1=1";
  });
}

function renderMapLegend() {
  const legend = document.getElementById("mapLegend");
  legend.innerHTML = `
    <div class="legend-heading">Prior-Year Legend</div>
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
    const tagName = item.zip ? "button" : "div";
    const zipAttrs = item.zip ? ` type="button" data-zip="${escapeHtml(item.zip)}" data-metric="${escapeHtml(item.metricId)}"` : "";
    const buttonClass = item.zip ? " chart-row-button" : "";

    return `
      <${tagName} class="chart-row${buttonClass}"${zipAttrs}>
        <div class="chart-label">${escapeHtml(item.label)}</div>
        <div class="chart-track" aria-hidden="true">
          <span class="chart-bar" style="width:${percent}%"></span>
        </div>
        <div class="chart-value">${escapeHtml(valueLabel)}</div>
      </${tagName}>
    `;
  }).join("");
}

renderBarChart("neighborhoodChart", neighborhoodChartData);
renderBarChart("zipChart", zipChartData);
renderBarChart("zipMedianYearsChart", zipMedianYearsData);

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
    url: "data/vacant_land_residential_triage.geojson",
    title: "Residential Vacant Parcels",
    outFields: ["*"],
    renderer,
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

  const map = new Map({
    basemap: "topo-vector",
    layers: [parcelLayer, zipBoundaryLayer]
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

  let selectedZip = null;
  let parcelLayerView = null;

  view.ui.add(new Home({ view }), "top-left");
  view.ui.add(new Search({ view, includeDefaultSources: true }), "top-right");
  view.ui.add(new BasemapToggle({ view, nextBasemap: "satellite" }), "bottom-right");

  const legend = new Legend({
    view,
    layerInfos: [{ layer: parcelLayer, title: "Prior-year triage band" }]
  });
  view.ui.add(new Expand({ view, content: legend, expanded: false, expandTooltip: "Legend" }), "top-left");

  renderMapLegend();
  renderBandFilters(parcelLayer);

  view.whenLayerView(parcelLayer).then((layerView) => {
    parcelLayerView = layerView;
  });

  function clearZipSelection() {
    selectedZip = null;
    zipBoundaryLayer.definitionExpression = "1=0";
    zipFocusCard.classList.add("is-hidden");
    document.querySelectorAll("[data-zip]").forEach((row) => row.classList.remove("is-active"));

    if (parcelLayerView) {
      parcelLayerView.filter = null;
    }
  }

  document.querySelectorAll(".bookmark").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.textContent.trim() === "Citywide") clearZipSelection();
      const center = button.dataset.center.split(",").map(Number);
      const zoom = Number(button.dataset.zoom);
      view.goTo({ center, zoom }, { duration: 750 });
    });
  });

  document.querySelectorAll("[data-zip]").forEach((button) => {
    button.addEventListener("click", async () => {
      const zip = button.dataset.zip;
      const item = [...zipChartData, ...zipMedianYearsData].find((candidate) => (
        candidate.zip === zip && candidate.metricId === button.dataset.metric
      ));

      if (selectedZip === zip && button.classList.contains("is-active")) {
        clearZipSelection();
        setStatus("ZIP boundary filter cleared.", false);
        setTimeout(() => setStatus("", true), 2500);
        return;
      }

      selectedZip = zip;
      document.querySelectorAll("[data-zip]").forEach((row) => {
        row.classList.toggle("is-active", row === button);
      });

      zipBoundaryLayer.definitionExpression = `ZCTA5 = '${zip.replaceAll("'", "''")}'`;
      setZipFocus(item);
      setStatus("", true);

      try {
        const query = zipBoundaryLayer.createQuery();
        query.where = zipBoundaryLayer.definitionExpression;
        query.returnGeometry = true;
        query.outFields = ["ZCTA5"];
        const result = await zipBoundaryLayer.queryFeatures(query);
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
        setStatus(`Could not load the ${zip} boundary from Census TIGERweb.`, false);
      }
    });
  });

  parcelLayer.when(() => {
    setStatus("20,488 residential-focused vacant parcels loaded. Click a parcel for triage details.", false);
    view.goTo(parcelLayer.fullExtent.expand(1.08), { duration: 600 }).catch(() => {});
    setTimeout(() => setStatus("", true), 4200);
  }).catch((error) => {
    console.error(error);
    setStatus("Map data did not load. Serve this folder through a web server and check the GeoJSON path.");
  });
});
