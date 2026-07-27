#!/usr/bin/env python3
"""
sync-collections.py
Run: python3 sync-collections.py

Scans images/landscape/ and images/street/ for subfolders.
Each subfolder becomes a collection in data/photos.json.
- File named "cover.*" is used as the cover image.
- If no cover file, the first image alphabetically is used.
- All other images become the photo list (sorted alphabetically).
- Reads image dimensions and stores w/h for justified layout.
"""

import json, os, re, struct

ROOT       = os.path.dirname(os.path.abspath(__file__))
JSON_FILE  = os.path.join(ROOT, "data", "photos.json")
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
CATEGORIES = ["landscape", "street"]

def is_image(filename):
    return os.path.splitext(filename)[1].lower() in IMAGE_EXTS

def get_image_size(path):
    ext = os.path.splitext(path)[1].lower()
    try:
        with open(path, 'rb') as f:
            if ext in ('.jpg', '.jpeg'):
                w, h = _jpeg_size(f)
                orientation = _jpeg_exif_orientation(f)
                if orientation in (5, 6, 7, 8):  # rotated 90° or 270°
                    w, h = h, w
                return w, h
            elif ext == '.png':
                return _png_size(f)
    except Exception:
        pass
    return None, None

def _jpeg_exif_orientation(f):
    """Return EXIF orientation tag value (1 = normal, 6 = 90°CW, 8 = 270°CW, etc.)"""
    try:
        f.seek(0)
        if f.read(2) != b'\xff\xd8':
            return 1
        while True:
            marker = f.read(2)
            if len(marker) < 2 or marker[0] != 0xff:
                break
            length = struct.unpack('>H', f.read(2))[0]
            if marker[1] == 0xe1:  # APP1 = EXIF
                data = f.read(length - 2)
                return _parse_exif_orientation(data)
            f.seek(length - 2, 1)
    except Exception:
        pass
    return 1

def _parse_exif_orientation(data):
    if data[:6] != b'Exif\x00\x00':
        return 1
    tiff = data[6:]
    endian = '<' if tiff[:2] == b'II' else '>' if tiff[:2] == b'MM' else None
    if not endian:
        return 1
    ifd_offset = struct.unpack(endian + 'I', tiff[4:8])[0]
    num_entries = struct.unpack(endian + 'H', tiff[ifd_offset:ifd_offset+2])[0]
    for i in range(num_entries):
        off = ifd_offset + 2 + i * 12
        tag = struct.unpack(endian + 'H', tiff[off:off+2])[0]
        if tag == 0x0112:  # Orientation
            return struct.unpack(endian + 'H', tiff[off+8:off+10])[0]
    return 1

def _png_size(f):
    f.read(8)   # PNG signature
    f.read(4)   # chunk length
    f.read(4)   # 'IHDR'
    w = struct.unpack('>I', f.read(4))[0]
    h = struct.unpack('>I', f.read(4))[0]
    return w, h

def _jpeg_size(f):
    if f.read(2) != b'\xff\xd8':
        return None, None
    while True:
        marker = f.read(2)
        if len(marker) < 2 or marker[0] != 0xff:
            break
        if marker[1] in (0xc0, 0xc1, 0xc2, 0xc9, 0xca):
            f.read(3)  # length + precision
            h = struct.unpack('>H', f.read(2))[0]
            w = struct.unpack('>H', f.read(2))[0]
            return w, h
        else:
            length = struct.unpack('>H', f.read(2))[0]
            f.read(length - 2)
    return None, None

def scan_category(category):
    cat_dir = os.path.join(ROOT, "images", category)
    if not os.path.isdir(cat_dir):
        return []

    collections = []
    for folder in sorted(os.listdir(cat_dir)):
        folder_path = os.path.join(cat_dir, folder)
        if not os.path.isdir(folder_path):
            continue

        images = sorted(f for f in os.listdir(folder_path) if is_image(f))
        if not images:
            continue

        # Pick cover: prefer file with "cover" in name, else first image
        cover_file = next(
            (f for f in images if "cover" in f.lower()), images[0]
        )
        photo_files = [f for f in images if f != cover_file]

        # Support two naming formats:
        #   Hyphen: "japan-hokkaido-2023" or "ICELAND-vik-2023"
        #           → title=first segment (uppercased), subtitle=last segment if year
        #   Space:  "NEW ZEALAND 2025" or "JAPAN 2023"
        #           → title=everything before year, subtitle=year
        if '-' in folder:
            parts = folder.split('-')
            if re.match(r'^20\d{2}$', parts[-1]):
                subtitle = parts[-1]
                title    = parts[0].upper()
            else:
                subtitle = ""
                title    = parts[0].upper()
            col_id = f"{folder.lower().replace(' ', '-')}-{category}"
        else:
            year_match = re.search(r'\b(20\d{2})\s*$', folder)
            if year_match:
                title    = folder[:year_match.start()].strip()
                subtitle = year_match.group(1)
            else:
                title    = folder
                subtitle = ""
            col_id = f"{title.lower().replace(' ', '-')}-{subtitle + '-' if subtitle else ''}{category}"

        photos = []
        for f in photo_files:
            full_path = os.path.join(folder_path, f)
            w, h = get_image_size(full_path)
            entry = {"src": f"images/{category}/{folder}/{f}", "caption": ""}
            if w and h:
                entry["w"] = w
                entry["h"] = h
            photos.append(entry)

        collections.append({
            "id":          col_id,
            "category":    category,
            "title":       title,
            "subtitle":    subtitle,
            "description": "",
            "cover":       f"images/{category}/{folder}/{cover_file}",
            "photos":      photos
        })

    return collections

# ---- Load existing JSON ----
with open(JSON_FILE, "r") as fh:
    data = json.load(fh)

# ---- Preserve existing description/captions ----
# Index by (title, subtitle, category) so renames don't lose data
def _key(col):
    return (col["title"], col["subtitle"], col["category"])

existing_by_id  = {col["id"]: col for col in data.get("collections", [])}
existing_by_key = {_key(col): col for col in data.get("collections", [])}

all_collections = []
for category in CATEGORIES:
    for col in scan_category(category):
        old = existing_by_id.get(col["id"]) or existing_by_key.get(_key(col), {})
        col["subtitle"]    = col["subtitle"] or old.get("subtitle", "")
        col["description"] = old.get("description", "") or col["description"]
        old_captions = {p["src"]: p.get("caption", "") for p in old.get("photos", [])}
        for p in col["photos"]:
            p["caption"] = old_captions.get(p["src"], "")
        all_collections.append(col)

data["collections"] = all_collections

with open(JSON_FILE, "w") as fh:
    json.dump(data, fh, indent=2, ensure_ascii=False)

# ---- Report ----
total_photos = sum(len(c["photos"]) for c in all_collections)
print(f"✓ Synced {len(all_collections)} collection(s), {total_photos} photo(s):")
for col in all_collections:
    print(f"  [{col['category']}] {col['title']} — {len(col['photos'])} photo(s), cover: {os.path.basename(col['cover'])}")
