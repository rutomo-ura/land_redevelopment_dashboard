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

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer",
  "esri/widgets/Home",
  "esri/widgets/Search",
  "esri/widgets/BasemapToggle",
  "esri/widgets/Legend",
  "esri/widgets/Expand"
], (Map, MapView, GeoJSONLayer, Home, Search, BasemapToggle, Legend, Expand) => {
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

  const map = new Map({
    basemap: "topo-vector",
    layers: [parcelLayer]
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
        position: "bottom-right"
      }
    }
  });

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

  document.querySelectorAll(".bookmark").forEach((button) => {
    button.addEventListener("click", () => {
      const center = button.dataset.center.split(",").map(Number);
      const zoom = Number(button.dataset.zoom);
      view.goTo({ center, zoom }, { duration: 750 });
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
