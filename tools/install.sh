#!/usr/bin/env bash
# Compatibility wrapper. No scanning, downloads or Git hooks.
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/../bin/videohand.mjs" install "$@"
