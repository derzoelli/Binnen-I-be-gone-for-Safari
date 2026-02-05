#!/bin/sh
set -eu

# JS regex sanity checks via JavaScriptCore (no Node dependency)
osascript -l JavaScript scripts/regex_sanity_test.js
