#!/usr/bin/env python3
"""Validate the checked-in Icon Composer and Safari icon assets."""

import json
import shutil
import struct
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DESIGN = ROOT / "Design"
APP_ICONS = DESIGN / "AppIcon"
IMAGES = ROOT / "Shared (Extension)/Resources/images"
MANIFEST = ROOT / "Shared (Extension)/Resources/manifest.json"
PROJECT = ROOT / "Binnen-I be gone.xcodeproj/project.pbxproj"
ASSETS = ROOT / "Shared (App)/Assets.xcassets"
SIZES = (16, 19, 32, 38)
EXTENSION_SIZES = (48, 64, 96, 128, 256, 512)


def png_size(path):
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"Not a PNG: {path}"
    assert data[12:16] == b"IHDR", f"Missing PNG header: {path}"
    return struct.unpack(">II", data[16:24])


def check_png(path, size, source):
    assert png_size(path) == (size, size), f"Wrong dimensions: {path}"
    if shutil.which("rsvg-convert"):
        rendered = subprocess.check_output(
            ["rsvg-convert", "-w", str(size), "-h", str(size), str(source)]
        )
        assert path.read_bytes() == rendered, f"Regenerate stale icon: {path}"


def check_composer_icon(name, expected_layers):
    icon = APP_ICONS / f"{name}.icon"
    document = json.loads((icon / "icon.json").read_text())
    layers = [layer for group in document["groups"] for layer in group["layers"]]
    found = {layer["image-name"] for layer in layers}
    assert found == set(expected_layers), f"Unexpected {name} layers: {found}"
    for filename in expected_layers:
        assert (icon / "Assets" / filename).read_bytes() == (APP_ICONS / filename).read_bytes(), (
            f"{name} has an outdated {filename} layer"
        )


def check_project():
    project = json.loads(subprocess.check_output(["plutil", "-convert", "json", "-o", "-", str(PROJECT)]))
    objects = project["objects"]
    file_refs = {
        ref: obj.get("path")
        for ref, obj in objects.items()
        if obj.get("isa") == "PBXFileReference"
    }
    expected_icons = {"AppIcon.icon", "AppIconBeta.icon"}
    for platform in ("iOS", "macOS"):
        target = next(
            obj for obj in objects.values()
            if obj.get("isa") == "PBXNativeTarget" and obj.get("name") == f"Binnen-I be gone ({platform})"
        )
        configurations = objects[target["buildConfigurationList"]]["buildConfigurations"]
        actual = {objects[ref]["name"]: objects[ref]["buildSettings"] for ref in configurations}
        assert set(actual) == {"Debug", "Beta", "Release"}, (platform, actual.keys())
        for name, icon in (("Debug", "AppIconBeta"), ("Beta", "AppIconBeta"), ("Release", "AppIcon")):
            assert actual[name]["ASSETCATALOG_COMPILER_APPICON_NAME"] == icon, (platform, name)
            key = "IPHONEOS_DEPLOYMENT_TARGET" if platform == "iOS" else "MACOSX_DEPLOYMENT_TARGET"
            assert str(actual[name][key]) == ("15.0" if platform == "iOS" else "12.0")
        resource_paths = {
            file_refs.get(objects[build]["fileRef"])
            for phase in target["buildPhases"]
            if objects[phase]["isa"] == "PBXResourcesBuildPhase"
            for build in objects[phase]["files"]
        }
        assert expected_icons <= resource_paths, (platform, resource_paths)
    assert not any(path == "Resources/META-INF" for path in file_refs.values())


def main():
    manifest = json.loads(MANIFEST.read_text())
    assert manifest["manifest_version"] == 2
    assert manifest["icons"] == {
        str(size): f"images/icon{size}.png" for size in EXTENSION_SIZES
    }
    assert manifest["browser_action"]["default_icon"] == {
        str(size): f"images/toolbar/on-{size}.png" for size in SIZES
    }

    for size in EXTENSION_SIZES:
        check_png(IMAGES / f"icon{size}.png", size, APP_ICONS / "extension.svg")
    for variant in ("on", "off", "oni", "offi"):
        for size in SIZES:
            check_png(IMAGES / "toolbar" / f"{variant}-{size}.png", size, DESIGN / "Toolbar" / f"{variant}.svg")
    large_icon = ASSETS / "LargeIcon.imageset"
    large_icon_contents = json.loads((large_icon / "Contents.json").read_text())
    assert {
        image["scale"]: image["filename"] for image in large_icon_contents["images"]
    } == {"1x": "icon128.png", "2x": "icon256.png", "3x": "icon384.png"}
    for size in (128, 256, 384):
        check_png(large_icon / f"icon{size}.png", size, APP_ICONS / "extension.svg")

    check_composer_icon("AppIcon", ("01-background.svg", "02-letter.svg", "03-slash.svg"))
    check_composer_icon("AppIconBeta", ("01-background.svg", "02-letter.svg", "03-slash-beta.svg", "04-beta-marker.svg"))
    assert not (ASSETS / "AppIcon.appiconset").exists()
    assert not (ROOT / "Shared (Extension)/Resources/META-INF").exists()
    assert not list(IMAGES.glob("iconOn*.png")) and not list(IMAGES.glob("iconOff*.png"))
    check_project()
    print("Icon assets: 25 PNG sizes, both Icon Composer variants, manifest and Xcode configurations OK")


if __name__ == "__main__":
    main()
