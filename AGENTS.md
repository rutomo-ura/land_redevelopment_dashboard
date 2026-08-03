# Agent instructions

Before changing this repository, read [HANDOVER.md](HANDOVER.md), [README.md](README.md), and the canonical [architecture/data-flow notes](docs/landcare-webapp-patterns-for-vacant-land.md).

- Live data is ArcGIS-first; the versioned `docs/data/` and `webmap/data/` bundles are the public fallback and release contract.
- Preserve the parcel grain, field names, exclusions, source precedence, QA gates, and `main` branch workflow unless the change explicitly updates documentation and tests.
- Do not change schema, denominator, ownership rules, or ArcGIS item/service URLs without updating the source notes and smoke tests.
- Do not add passwords, PATs, private keys, database credentials, or Actions secret values to code, logs, issues, or documentation.
- For code or data changes, run the relevant Python scripts, `python scripts/validate_daily_refresh.py` when a current refresh is available, and a Pages/ArcGIS browser smoke test before pushing.
- Keep `docs/data/` and `webmap/data/` synchronized. Data refreshes may publish only the documented public-safe paths.
- Use a `codex/` branch and a pull request into `main`; never rewrite published history.
