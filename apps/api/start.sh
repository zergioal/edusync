#!/bin/sh
export PUPPETEER_EXECUTABLE_PATH=$(which chromium || which chromium-browser || echo "")
exec node apps/api/dist/index.js
