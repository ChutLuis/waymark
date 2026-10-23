#!/usr/bin/env bash
# Puts the emulator into (or out of) store-screenshot mode.
#   tools/device/store-mode.sh on   -> 1080×2160 (Play's 2:1 maximum) and a clean
#                                      demo status bar (09:41, full battery and Wi-Fi)
#   tools/device/store-mode.sh off  -> the physical size and the live status bar
# The app lays itself out for 2:1, so `store/render.sh shot` only drops alpha
# instead of cropping away the top bar or the tab bar. Hide the dev Tools
# button and use light mode first.
set -euo pipefail
demo() { adb shell am broadcast -a com.android.systemui.demo -e command "$@" >/dev/null; }
case "${1:-}" in
  on)
    adb shell wm size 1080x2160
    adb shell settings put global sysui_demo_allowed 1
    demo enter
    demo clock -e hhmm 0941
    demo battery -e level 100 -e plugged false
    demo network -e wifi show -e level 4 -e fully true
    demo network -e mobile hide
    demo notifications -e visible false
    ;;
  off)
    demo exit
    adb shell settings put global sysui_demo_allowed 0
    adb shell wm size reset
    ;;
  *)
    echo "usage: $0 on|off" >&2
    exit 2
    ;;
esac
