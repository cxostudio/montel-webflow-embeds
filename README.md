# Montel · Webflow embeds

Animations for the Montel website (montel.webflow.io), built by CXO Studio.
Served to Webflow through jsDelivr, pinned to a git tag so every release is immutable.

## Data page (`/data`)

| File | What it does |
|---|---|
| `dist/montel-data.min.css` | Hero map, coverage map, Data page layout glue |
| `dist/montel-data.min.js` | On /data only: swaps the hero image for the live hero map and the "Where you work" image for the catalogue animation, and runs the "Explore by country" coverage map |

Loaded on the Data page only (page settings, set through the Webflow API):

```html
<!-- head -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/cxostudio/montel-webflow-embeds@vX.Y.Z/dist/montel-data.min.css" integrity="sha384-…" crossorigin="anonymous">
<!-- before </body> -->
<script src="https://cdn.jsdelivr.net/gh/cxostudio/montel-webflow-embeds@vX.Y.Z/dist/montel-data.min.js" integrity="sha384-…" crossorigin="anonymous"></script>
```

### What the coverage map reads from Webflow

- CMS collection **Countries**: `Code` (ISO 2), `Power/Gas/Carbon/Fundamentals products` (comma lists) and `… sources`.
- A Collection List whose items carry `data-mtl-cov-item`, `data-code`, `data-name`, `data-power`, `data-gas`, `data-carbon`, `data-fund`.
- A Code Embed containing `<div class="mtl-covmap" data-mtl-covmap data-default="NL"></div>`.

Content changes happen in the CMS only. Code changes: edit `src/`, run `build/build.sh`, commit, tag, update the URLs + SRI in Webflow.

## Layout

```
src/shared/     montel-map-data.js (Europe dot grid, Natural Earth), montel-map-borders.js (outlines, same projection)
src/data-page/  mount.js, montel-map.{js,css} (hero), montel-coverage-map.{js,css}, montel-catalogue.{js,css}, page.css
build/          build.sh (esbuild), build-map.js / build-borders.js (regenerate the geo data)
dist/           minified bundles served by jsDelivr
```

Map data: Natural Earth, public domain.
