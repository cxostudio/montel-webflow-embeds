#!/bin/sh
# Builds dist/montel-data.min.{css,js} for the Data page. Order matters: mount first, data before the maps.
set -e
cd "$(dirname "$0")/.."
E=${ESBUILD:-/tmp/esb/node_modules/.bin/esbuild}
cat src/data-page/mount.js src/shared/montel-map-data.js src/shared/montel-map-borders.js src/data-page/montel-map.js src/data-page/montel-coverage-map.js src/data-page/montel-catalogue.js src/shared/data-visual.js src/shared/data-stats.js | $E --minify --loader=js > dist/montel-data.min.js
cat src/data-page/montel-map.css src/data-page/montel-coverage-map.css src/data-page/montel-catalogue.css src/data-page/page.css src/shared/data-visual.css | $E --minify --loader=css > dist/montel-data.min.css
wc -c dist/*

# Hero pages: one bundle each (mount first, then the animation). Mounts are generated from embed.html.
python3 build/gen-mounts.py
for p in analytics:montel-fa risk:montel-risk news:montel-news; do
  page=${p%%:*}; m=${p#*:}
  cat src/$page-page/mount.js src/$page-page/$m.js src/shared/data-stats.js | $E --minify --loader=js > dist/montel-$page.min.js
  cat src/$page-page/$m.css src/shared/hero.css | $E --minify --loader=css > dist/montel-$page.min.css
done
wc -c dist/*

# Home: core first, then the five slides
cat src/home-page/mount.js src/home-page/montel-motion-core.js src/home-page/slide-trade.js src/home-page/slide-forecast.js src/home-page/slide-assets.js src/home-page/slide-ppa.js src/home-page/slide-advice.js src/shared/montel-map-data.js src/home-page/flags-data.js src/home-page/eco-visuals.js src/home-page/fixes.js src/shared/data-visual.js src/shared/data-stats.js | $E --minify --loader=js > dist/montel-home.min.js
cat src/home-page/montel-motion-core.css src/home-page/slide-*.css src/home-page/page.css src/home-page/eco-visuals.css src/home-page/fixes.css src/shared/data-visual.css | $E --minify --loader=css > dist/montel-home.min.css
wc -c dist/montel-home.*
