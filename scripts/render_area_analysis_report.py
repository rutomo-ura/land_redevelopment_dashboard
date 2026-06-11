r"""Render area-level vacant land analysis charts and an HTML report."""

from __future__ import annotations

import html
from pathlib import Path

import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker


REPO_ROOT = Path(r"C:\rutomo-codefolder\vacant-land-triage-map")
EXPORT_DIR = REPO_ROOT / "exports"
REPORT_DIR = REPO_ROOT / "reports"
ASSET_DIR = REPORT_DIR / "assets"

TOKENS = {
    "surface": "#FCFCFD",
    "panel": "#FFFFFF",
    "ink": "#1F2430",
    "muted": "#6F768A",
    "grid": "#E6E8F0",
    "axis": "#D7DBE7",
}
BLUE = {"base": "#A3BEFA", "mid": "#5477C4", "dark": "#2E4780"}
GOLD = {"base": "#FFE15B", "mid": "#B8A037", "dark": "#736422"}


def _setup_style() -> None:
    sns.set_theme(style="whitegrid")
    plt.rcParams.update(
        {
            "figure.facecolor": TOKENS["surface"],
            "axes.facecolor": TOKENS["panel"],
            "axes.edgecolor": TOKENS["axis"],
            "axes.labelcolor": TOKENS["ink"],
            "xtick.color": TOKENS["muted"],
            "ytick.color": TOKENS["ink"],
            "text.color": TOKENS["ink"],
            "font.family": ["Segoe UI", "DejaVu Sans", "Arial", "sans-serif"],
            "axes.titleweight": "bold",
        }
    )


def _add_header(fig, title: str, subtitle: str) -> None:
    fig.text(0.02, 0.965, title, ha="left", va="top", fontsize=16, fontweight="bold")
    fig.text(0.02, 0.925, subtitle, ha="left", va="top", fontsize=10.5, color=TOKENS["muted"])


def _ranked_bar(
    frame: pd.DataFrame,
    category: str,
    value: str,
    output: Path,
    title: str,
    subtitle: str,
    color: str,
    value_suffix: str = "",
) -> None:
    top = frame.head(12).copy()
    top = top.sort_values(value, ascending=True)

    fig, ax = plt.subplots(figsize=(11, 7), dpi=180)
    _add_header(fig, title, subtitle)
    sns.barplot(data=top, x=value, y=category, ax=ax, color=color, edgecolor=TOKENS["ink"], linewidth=0.45)

    ax.set_xlabel("")
    ax.set_ylabel("")
    ax.xaxis.grid(True, color=TOKENS["grid"], linewidth=0.8)
    ax.yaxis.grid(False)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(TOKENS["axis"])
    ax.spines["bottom"].set_color(TOKENS["axis"])
    ax.xaxis.set_major_formatter(mticker.StrMethodFormatter("{x:,.0f}"))

    max_value = float(top[value].max() or 1)
    ax.set_xlim(0, max_value * 1.18)
    for patch in ax.patches:
        width = patch.get_width()
        ax.text(
            width + max_value * 0.015,
            patch.get_y() + patch.get_height() / 2,
            f"{width:,.0f}{value_suffix}",
            va="center",
            ha="left",
            fontsize=9.5,
            color=TOKENS["ink"],
        )

    fig.subplots_adjust(left=0.28, right=0.96, top=0.86, bottom=0.1)
    fig.savefig(output, bbox_inches="tight", facecolor=TOKENS["surface"])
    plt.close(fig)


def _ranked_pct_bar(frame: pd.DataFrame, category: str, value: str, output: Path) -> None:
    top = frame.head(12).copy()
    top[category] = top[category].astype(str)
    top = top.sort_values(value, ascending=True)

    fig, ax = plt.subplots(figsize=(11, 7), dpi=180)
    _add_header(
        fig,
        "ZIP vacancy penetration",
        "Residential-ish vacant parcels as a share of all residential assessment parcels; minimum 100 residential parcels per ZIP.",
    )
    sns.barplot(data=top, x=value, y=category, ax=ax, color=BLUE["base"], edgecolor=BLUE["dark"], linewidth=0.45)

    ax.set_xlabel("")
    ax.set_ylabel("")
    ax.xaxis.grid(True, color=TOKENS["grid"], linewidth=0.8)
    ax.yaxis.grid(False)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(TOKENS["axis"])
    ax.spines["bottom"].set_color(TOKENS["axis"])
    ax.xaxis.set_major_formatter(mticker.PercentFormatter(xmax=100, decimals=0))

    max_value = float(top[value].max() or 1)
    ax.set_xlim(0, max_value * 1.2)
    for patch in ax.patches:
        width = patch.get_width()
        ax.text(
            width + max_value * 0.015,
            patch.get_y() + patch.get_height() / 2,
            f"{width:.1f}%",
            va="center",
            ha="left",
            fontsize=9.5,
            color=TOKENS["ink"],
        )

    fig.subplots_adjust(left=0.2, right=0.96, top=0.86, bottom=0.1)
    fig.savefig(output, bbox_inches="tight", facecolor=TOKENS["surface"])
    plt.close(fig)


def _table_rows(frame: pd.DataFrame, columns: list[str], limit: int = 8) -> str:
    rows = []
    for _, row in frame.head(limit).iterrows():
        cells = "".join(f"<td>{html.escape(str(row[col]))}</td>" for col in columns)
        rows.append(f"<tr>{cells}</tr>")
    return "\n".join(rows)


def main() -> None:
    REPORT_DIR.mkdir(exist_ok=True)
    ASSET_DIR.mkdir(exist_ok=True)
    _setup_style()

    neighborhoods = pd.read_csv(EXPORT_DIR / "neighborhood_vacancy_concentration.csv")
    zips = pd.read_csv(EXPORT_DIR / "zip_vacancy_penetration.csv")

    neighborhoods = neighborhoods.sort_values("residential_vacant_parcels", ascending=False)
    zips = zips.sort_values("vacant_penetration_pct", ascending=False)

    neighborhood_chart = ASSET_DIR / "neighborhood_vacancy_concentration.png"
    zip_chart = ASSET_DIR / "zip_vacancy_penetration.png"

    _ranked_bar(
        neighborhoods,
        "neighborhood",
        "residential_vacant_parcels",
        neighborhood_chart,
        "Named neighborhoods with the largest vacant residential parcel concentration",
        "EPP-linked neighborhoods; filtered to residential-ish vacant parcels, excluding infrastructure and parcels above 2 acres.",
        GOLD["base"],
    )
    _ranked_pct_bar(zips, "propertyzip", "vacant_penetration_pct", zip_chart)

    top_neighborhood = neighborhoods.iloc[0]
    top_zip = zips.iloc[0]

    html_text = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Vacant Land Triage Area Analysis</title>
  <style>
    body {{ margin: 0; background: #FCFCFD; color: #1F2430; font-family: Aptos, Segoe UI, Arial, sans-serif; }}
    main {{ max-width: 1040px; margin: 0 auto; padding: 40px 24px 64px; }}
    h1 {{ font-size: 34px; margin: 0 0 24px; }}
    h2 {{ font-size: 22px; margin: 36px 0 12px; }}
    p, li {{ font-size: 16px; line-height: 1.55; }}
    .summary {{ background: #fff; border: 1px solid #E6E8F0; padding: 18px 22px; }}
    .summary li {{ margin: 8px 0; }}
    img {{ display: block; max-width: 100%; background: #fff; border: 1px solid #E6E8F0; }}
    table {{ border-collapse: collapse; width: 100%; background: #fff; margin-top: 10px; font-size: 14px; }}
    th, td {{ text-align: left; border-bottom: 1px solid #E6E8F0; padding: 9px 10px; }}
    th {{ color: #464C55; background: #F4F5F7; }}
    .note {{ color: #6F768A; font-size: 14px; }}
  </style>
</head>
<body>
<main>
  <h1>Vacant Land Triage Area Analysis</h1>

  <h2>Executive Summary</h2>
  <ul class="summary">
    <li><strong>The strongest named-neighborhood concentrations are in Perry South, Larimer, Hazelwood, and Homewood.</strong> Perry South has {int(top_neighborhood['residential_vacant_parcels']):,} residential-ish vacant parcels in the EPP-linked neighborhood view.</li>
    <li><strong>The highest ZIP-level residential vacancy penetration is in {top_zip['propertyzip']}.</strong> Its filtered vacant residential parcel share is {float(top_zip['vacant_penetration_pct']):.1f}% of residential assessment parcels.</li>
    <li><strong>The map should use two scales.</strong> Zoomed-out views should compare ZIP penetration and named-neighborhood concentration; zoomed-in views should inspect parcel clusters in Homewood, Larimer, Perry South, Middle Hill, and Hazelwood.</li>
  </ul>

  <h2>Named neighborhoods show where to zoom in</h2>
  <p><strong>Use this as the cluster-finding view.</strong> The named-neighborhood data comes from EPP-linked parcels, so it is best interpreted as concentration among the inventory that has neighborhood names, not a complete citywide neighborhood rate.</p>
  <img src="assets/neighborhood_vacancy_concentration.png" alt="Ranked bar chart of named neighborhoods by residential vacant parcels">
  <table>
    <thead><tr><th>Neighborhood</th><th>Residential vacant parcels</th><th>Vacant acres</th><th>5+ prior-year parcels</th><th>EPP vacant-like share</th></tr></thead>
    <tbody>
      {_table_rows(neighborhoods, ['neighborhood', 'residential_vacant_parcels', 'vacant_acres', 'parcels_prior_years_5_plus', 'epp_vacant_like_share_pct'])}
    </tbody>
  </table>

  <h2>ZIP penetration gives a cleaner rate denominator</h2>
  <p><strong>Use this as the area-average view.</strong> ZIP penetration divides filtered residential-ish vacant parcels by all residential assessment parcels in the ZIP, which makes it more defensible as a rate.</p>
  <img src="assets/zip_vacancy_penetration.png" alt="Ranked bar chart of ZIP vacancy penetration">
  <table>
    <thead><tr><th>ZIP</th><th>Total residential parcels</th><th>Vacant parcels</th><th>Vacant penetration</th><th>Median building age</th></tr></thead>
    <tbody>
      {_table_rows(zips, ['propertyzip', 'total_residential_parcels', 'residential_vacant_parcels', 'vacant_penetration_pct', 'median_building_age'])}
    </tbody>
  </table>

  <h2>Recommended next steps</h2>
  <ol>
    <li>Keep the ArcGIS parcel map as the zoom-in diagnostic view.</li>
    <li>Add the ZIP chart and named-neighborhood chart to the layout as evidence panels.</li>
    <li>Create two map bookmarks: one wide city view and one zoomed-in Homewood/Hill District or Larimer/Perry South detail view.</li>
    <li>If a true neighborhood boundary table becomes available, replace the EPP concentration table with a true neighborhood vacancy-rate choropleth.</li>
  </ol>

  <h2>Caveats and assumptions</h2>
  <p class="note">Residential-ish vacant parcels exclude obvious infrastructure, government, rail, utility, commercial, industrial, right-of-way, park, cemetery, air-rights, warehouse, and office categories, and exclude parcels above 2 acres. ZIP penetration uses assessment residential parcels as the denominator. Named-neighborhood concentration uses EPP-linked parcels because clean neighborhood names were not available in the all-parcel denominator.</p>
</main>
</body>
</html>
"""

    (REPORT_DIR / "vacant_land_area_analysis.html").write_text(html_text, encoding="utf-8")
    print(REPORT_DIR / "vacant_land_area_analysis.html")


if __name__ == "__main__":
    main()
