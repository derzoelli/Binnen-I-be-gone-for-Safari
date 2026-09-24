#!/bin/sh
set -eu

# Shared JavaScriptCore fixture assertions (same corpus as the Xcode test target).
osascript -l JavaScript scripts/regex_sanity_test.js
