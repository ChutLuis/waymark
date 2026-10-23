#!/usr/bin/env bash
# Screenshot the connected Android device/emulator.
#   tools/device/cap.sh NAME [DIR]  -> DIR/NAME.png (full size) and DIR/NAME_s.png (40%)
# DIR defaults to /tmp/waymark-shots. Needs adb and ImageMagick (`magick`).
set -euo pipefail
dir=${2:-/tmp/waymark-shots}
mkdir -p "$dir"
adb exec-out screencap -p > "$dir/$1.png"
magick "$dir/$1.png" -resize 40% "$dir/$1_s.png"
echo "$dir/$1_s.png"
