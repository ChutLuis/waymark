#!/usr/bin/env bash
# List the on-screen elements that have text or an accessibility label, with
# their centre point for `adb shell input tap X Y`. C marks clickable nodes.
#   tools/device/ui.sh [filter]   (case-insensitive substring)
# uiautomator can't dump while animations run ("could not get idle state");
# wait and retry. It also lists views TalkBack hides (importantForAccessibility).
set -euo pipefail
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
out=$(mktemp)
trap 'rm -f "$out"' EXIT
adb pull /sdcard/ui.xml "$out" >/dev/null 2>&1
python3 - "${1:-}" "$out" <<'EOF'
import re, sys
needle = sys.argv[1].lower()
xml = open(sys.argv[2], encoding='utf-8').read()
for m in re.finditer(r'<node [^>]*>', xml):
    node = m.group(0)
    text = re.search(r' text="([^"]*)"', node)
    desc = re.search(r'content-desc="([^"]*)"', node)
    bounds = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', node)
    if not bounds:
        continue
    label = ((text.group(1) if text else '') or (desc.group(1) if desc else '')).strip()
    if not label or (needle and needle not in label.lower()):
        continue
    x1, y1, x2, y2 = map(int, bounds.groups())
    flag = 'C' if 'clickable="true"' in node else ' '
    print(f"{flag} ({(x1 + x2) // 2},{(y1 + y2) // 2}) [{x1},{y1},{x2},{y2}] {label[:90]!r}")
EOF
