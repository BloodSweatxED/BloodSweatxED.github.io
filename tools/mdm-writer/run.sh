#!/usr/bin/env bash
# Start the MDM Note Writer on http://127.0.0.1:8787
set -e
cd "$(dirname "$0")"
exec node server.mjs
