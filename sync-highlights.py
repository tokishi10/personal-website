#!/usr/bin/env python3
"""
sync-highlights.py
Run: python3 sync-highlights.py
Scans images/highlights/ and updates the highlights array in data/photos.json
"""

import json, os, sys

ROOT           = os.path.dirname(os.path.abspath(__file__))
HIGHLIGHTS_DIR = os.path.join(ROOT, "images", "highlights")
JSON_FILE      = os.path.join(ROOT, "data", "photos.json")
IMAGE_EXTS     = {".jpg", ".jpeg", ".png", ".webp"}

files = sorted(
    f for f in os.listdir(HIGHLIGHTS_DIR)
    if os.path.splitext(f)[1].lower() in IMAGE_EXTS
)

if not files:
    print("No images found in images/highlights/")
    sys.exit(0)

with open(JSON_FILE, "r") as fh:
    data = json.load(fh)

data["highlights"] = [
    {"src": f"images/highlights/{f}", "caption": ""}
    for f in files
]

with open(JSON_FILE, "w") as fh:
    json.dump(data, fh, indent=2, ensure_ascii=False)

print(f"✓ Synced {len(files)} image(s) to photos.json:")
for f in files:
    print(f"  {f}")
