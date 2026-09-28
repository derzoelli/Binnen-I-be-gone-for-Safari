#!/bin/sh
set -eu

# Run from the repository root. Source SVGs in Design/ are the editable artwork.
command -v rsvg-convert >/dev/null || { echo "rsvg-convert is required to regenerate PNG assets" >&2; exit 1; }

for size in 48 64 96 128 256 512; do
    rsvg-convert -w "$size" -h "$size" Design/AppIcon/extension.svg \
        -o "Shared (Extension)/Resources/images/icon${size}.png"
done

for variant in on off oni offi; do
    for size in 16 19 32 38; do
        rsvg-convert -w "$size" -h "$size" "Design/Toolbar/${variant}.svg" \
            -o "Shared (Extension)/Resources/images/toolbar/${variant}-${size}.png"
    done
done

# The iOS launch storyboard renders LargeIcon at 128 points; generate native Retina sizes.
for size in 128 256 384; do
    rsvg-convert -w "$size" -h "$size" Design/AppIcon/extension.svg \
        -o "Shared (App)/Assets.xcassets/LargeIcon.imageset/icon${size}.png"
done
