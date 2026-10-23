#!/usr/bin/env bash
# Renders the Play listing assets in store/ without alpha (Play rejects alpha in
# feature graphics and screenshots). Fonts come from node_modules through a
# private fontconfig, so nothing is installed system-wide.
#   store/render.sh                      -> store/feature-graphic.png
#   store/render.sh shot IN.png OUT.png  -> a 1080×2160 (2:1) phone screenshot
#     (capture in tools/device/store-mode.sh on, so the crop has nothing to cut)
set -euo pipefail
cd "$(dirname "$0")/.."
FONTS=$(mktemp -d)
trap 'rm -rf "$FONTS"' EXIT
cp node_modules/@expo-google-fonts/besley/800ExtraBold/Besley_800ExtraBold.ttf \
   node_modules/@expo-google-fonts/besley/600SemiBold_Italic/Besley_600SemiBold_Italic.ttf \
   node_modules/@expo-google-fonts/courier-prime/700Bold/CourierPrime_700Bold.ttf "$FONTS/"
cat > "$FONTS/fonts.conf" <<CONF
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig><include ignore_missing="yes">/etc/fonts/fonts.conf</include><dir>$FONTS</dir><cachedir>$FONTS/cache</cachedir></fontconfig>
CONF
if [ "${1:-}" = "shot" ]; then
  # Crop the status and navigation bars away to reach 2:1, then drop alpha.
  magick "$2" -gravity center -crop 1080x2160+0+0 +repage -background '#E2E9EE' -alpha remove -alpha off "$3"
  exit 0
fi
FONTCONFIG_FILE="$FONTS/fonts.conf" rsvg-convert -w 1024 -h 500 store/feature-graphic.svg -o "$FONTS/fg.png"
magick "$FONTS/fg.png" -background '#FFFCF5' -alpha remove -alpha off store/feature-graphic.png
echo "store/feature-graphic.png"
