#!/usr/bin/env python3
"""Build-time-only icon selection; all other manifest fields remain identical."""

import json
import os
from pathlib import Path


def manifest_for_configuration(source, configuration):
    manifest = json.loads(json.dumps(source))
    if configuration in ("Debug", "Beta"):
        manifest["icons"] = {size: path.replace("images/", "images/beta/", 1)
                             for size, path in manifest["icons"].items()}
        for variant in manifest["icon_variants"]:
            variant["any"] = variant["any"].replace("images/", "images/beta/", 1)
    elif configuration != "Release":
        raise ValueError(f"Unknown icon configuration: {configuration}")
    return manifest


if __name__ == "__main__":
    source = Path(os.environ["SRCROOT"]) / "Shared (Extension)/Resources/manifest.json"
    destination = Path(os.environ["TARGET_BUILD_DIR"]) / os.environ["UNLOCALIZED_RESOURCES_FOLDER_PATH"] / "manifest.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(manifest_for_configuration(
        json.loads(source.read_text()), os.environ["CONFIGURATION"]), indent=2) + "\n")
