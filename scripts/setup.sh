#!/usr/bin/env bash
# macOS/Linux wrapper
command -v node >/dev/null || { echo "Node 20+ is required (https://nodejs.org)"; exit 1; }
node "$(dirname "$0")/setup.mjs" "$@"
