#!/usr/bin/env python3
"""Validate the checked-in Icon Composer and Safari icon assets."""

import json
import shutil
import struct
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

sys.dont_write_bytecode = True
from generate_safari_icons import artwork
from prepare_extension_manifest import manifest_for_configuration

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
    assert len(layers) == len(expected_layers), f"Duplicate {name} layers"
    glass_group = next(group for group in document["groups"]
                       if any(layer["image-name"] == "03-glass-slash.svg" for layer in group["layers"]))
    assert len(glass_group["layers"]) == 1, f"{name} ribbon needs its own material group"
    assert glass_group["refractivity"]["enabled"] and glass_group["refractivity"]["depth"] > 0, (
        f"{name} ribbon must retain native refraction"
    )
    assert "refractivity" in document["features"], f"{name} missing native glass feature"
    assert {asset.name for asset in (icon / "Assets").iterdir()
            if asset.is_file() and not asset.name.startswith(".")} == found, f"Unused {name} assets"
    for filename in expected_layers:
        assert (icon / "Assets" / filename).read_bytes() == (APP_ICONS / filename).read_bytes(), (
            f"{name} has an outdated {filename} layer"
        )
    # Both appearances must stay explicit; otherwise Composer's automatic color
    # treatment can turn the dark release I dark or lose the navy beta background.
    assert any(value.get("appearance") == "dark" for value in document["fill-specializations"]), name
    background = next(layer for layer in layers if layer["name"].startswith("01-"))
    assert any(value.get("appearance") == "dark" for value in background["fill-specializations"]), name
    if name == "AppIcon":
        letter = next(layer for layer in layers if layer["name"] == "02-letter")
        assert any(value.get("appearance") == "dark" and value["value"] == "system-light"
                   for value in letter["fill-specializations"]), "Dark release I must stay light"


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
    for platform in ("iOS", "macOS"):
        target = next(obj for obj in objects.values() if obj.get("isa") == "PBXNativeTarget"
                      and obj.get("name") == f"Binnen-I be gone Extension ({platform})")
        phases = [objects[ref] for ref in target["buildPhases"]]
        scripts = [phase for phase in phases if phase["isa"] == "PBXShellScriptBuildPhase"]
        assert len(scripts) == 1 and "prepare_extension_manifest.py" in scripts[0]["shellScript"]
        assert scripts[0]["outputPaths"] == ["$(TARGET_BUILD_DIR)/$(UNLOCALIZED_RESOURCES_FOLDER_PATH)/manifest.json"]
        resource_paths = {file_refs.get(objects[build]["fileRef"])
                          for phase in phases if phase["isa"] == "PBXResourcesBuildPhase"
                          for build in phase["files"]}
        assert "Resources/images" in resource_paths
        assert "Resources/manifest.json" not in resource_paths, "Duplicate manifest producer"


def check_safari_icons(manifest):
    for path, expected in artwork().items():
        assert path.read_text() == expected, f"Regenerate stale vector: {path}"
        root = ET.parse(path).getroot()
        assert not root.findall(".//{*}image"), f"SVG must be self-contained: {path}"
        assert not root.findall(".//{*}text"), f"No font dependency: {path}"

    for variant in ("on", "off", "oni", "offi"):
        root = ET.parse(DESIGN / "Toolbar" / f"{variant}.svg").getroot()
        assert not root.findall(".//{*}linearGradient") and not root.findall(".//{*}filter")
        assert root.get("viewBox") == "128 128 768 768", "Retain small-size optical bounds"
        # Pure monochrome, transparent canvas. Negative space separates I/ribbon,
        # so both remain distinguishable even when Safari applies one tint.
        paths = root.findall("{*}path")
        assert len(paths) == (2 if variant.startswith("on") else 1)
        assert {path.get("fill") for path in paths} == ({"#FFFFFF"} if variant.endswith("i") else {"#000000"})
        assert not root.findall("{*}rect"), "No toolbar tile background"

    assert manifest["icon_variants"] == [
        {"any": "images/icon.svg", "color_schemes": ["light"]},
        {"any": "images/icon-dark.svg", "color_schemes": ["dark"]},
    ]
    for configuration in ("Debug", "Beta", "Release"):
        selected = manifest_for_configuration(manifest, configuration)
        assert selected["browser_action"] == manifest["browser_action"], "Toolbar selection must remain unchanged"
        non_icons = lambda value: {key: item for key, item in value.items() if key not in ("icons", "icon_variants")}
        assert non_icons(selected) == non_icons(manifest), "Only visual manifest fields may change"
        prefix = "images/" if configuration == "Release" else "images/beta/"
        assert selected["icons"] == {str(size): f"{prefix}icon{size}.png" for size in EXTENSION_SIZES}
        assert [variant["any"] for variant in selected["icon_variants"]] == [prefix + "icon.svg", prefix + "icon-dark.svg"]
        for path in list(selected["icons"].values()) + [variant["any"] for variant in selected["icon_variants"]]:
            assert (MANIFEST.parent / path).is_file(), path
    # Exercise the real build entry point and guard configuration switching.
    with tempfile.TemporaryDirectory() as directory:
        import os
        for configuration in ("Debug", "Release", "Beta", "Release"):
            subprocess.run(["/usr/bin/python3", str(ROOT / "scripts/prepare_extension_manifest.py")], check=True,
                           env={**os.environ, "SRCROOT": str(ROOT), "TARGET_BUILD_DIR": directory,
                                "UNLOCALIZED_RESOURCES_FOLDER_PATH": "Resources", "CONFIGURATION": configuration})
            assert json.loads((Path(directory) / "Resources/manifest.json").read_text()) == manifest_for_configuration(manifest, configuration)


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
        check_png(IMAGES / f"icon{size}.png", size, IMAGES / "icon.svg")
        check_png(IMAGES / "beta" / f"icon{size}.png", size, IMAGES / "beta/icon.svg")
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

    check_composer_icon("AppIcon", ("01-background.svg", "02-letter.svg", "03-glass-slash.svg"))
    check_composer_icon("AppIconBeta", ("01-beta-background.svg", "02-beta-grid.svg", "03-beta-letter.svg", "03-glass-slash.svg"))
    assert not (ASSETS / "AppIcon.appiconset").exists()
    assert not (ROOT / "Shared (Extension)/Resources/META-INF").exists()
    assert not list(IMAGES.glob("iconOn*.png")) and not list(IMAGES.glob("iconOff*.png"))
    check_project()
    check_safari_icons(manifest)
    print("Icon assets: 31 PNG sizes, four Safari SVG appearances, monochrome toolbar, Composer and build selection OK")


if __name__ == "__main__":
    main()
