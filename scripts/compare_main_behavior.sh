#!/bin/sh
set -eu

# Compare the shared corpus against the transformation functions on main.
baseline="$(mktemp)"
trap 'rm -f "$baseline"' EXIT
git show 'main:Shared (Extension)/Resources/binnenibegone.js' > "$baseline"
osascript -l JavaScript scripts/compare_main_behavior.js "$baseline"
