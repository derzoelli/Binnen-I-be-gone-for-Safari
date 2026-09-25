#!/bin/sh
set -eu

# Generated copies for GitHub Pages; edit only the source files below.
mkdir -p docs/test/generated
cp 'Tests/Fixtures/gender-cases.json' docs/test/generated/gender-cases.json
cp 'Shared (Extension)/Resources/filter-engine.js' docs/test/generated/filter-engine.js
