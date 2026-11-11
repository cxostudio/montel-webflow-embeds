#!/bin/sh
# Builds dist/montel-data.min.{css,js} for the Data page. Order matters: mount first, data before the maps.
set -e
cd "$(dirname "$0")/.."
E=${ESBUILD:-/tmp/esb/node_modules/.bin/esbuild}
cat src/data-page/mount.js src/shared/montel-map-data.js src/shared/montel-map-borders.js src/data-page/montel-map.js src/data-page/montel-coverage-map.js | $E --minify --loader=js > dist/montel-data.min.js
cat src/data-page/montel-map.css src/data-page/montel-coverage-map.css src/data-page/page.css | $E --minify --loader=css > dist/montel-data.min.css
wc -c dist/*
