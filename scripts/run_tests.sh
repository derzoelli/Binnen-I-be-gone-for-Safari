#!/bin/sh
set -eu

# GitHub Pages publishes generated copies; fail if either source changed without regeneration.
cmp 'Tests/Fixtures/gender-cases.json' docs/test/generated/gender-cases.json
cmp 'Shared (Extension)/Resources/filter-engine.js' docs/test/generated/filter-engine.js

# Shared JavaScriptCore fixture assertions (same corpus as the Xcode test target).
osascript -l JavaScript scripts/regex_sanity_test.js
osascript -l JavaScript scripts/settings_broker_test.js
osascript -l JavaScript scripts/options_mode_test.js
osascript -l JavaScript scripts/public_test_page_test.js
