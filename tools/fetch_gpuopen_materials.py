"""Fetch GPUOpen MatLib materials for MeltMesh.

This script intentionally separates two jobs:

1. `--catalog-only` downloads the full GPUOpen material index and writes a
   browser-friendly JavaScript catalog. This is small and safe to commit.
2. `--download` downloads selected 1K/2K/4K MaterialX packages and texture
   files into `sample-models/gpuopen-cache/`. This can become very large, so it
   is opt-in.

Examples:

    python tools/fetch_gpuopen_materials.py --catalog-only
    python tools/fetch_gpuopen_materials.py --download "Brushed Steel" --resolution 1K
    python tools/fetch_gpuopen_materials.py --download-first 10 --resolution 1K
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import requests

API = "https://api.matlib.gpuopen.com/api"
ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "material-park-catalog.js"
CACHE = ROOT / "sample-models" / "gpuopen-cache"


def fetch_all(endpoint: str, limit: int = 100) -> list[dict]:
    items: list[dict] = []
    url: str | None = f"{API}/{endpoint}/"
    params = {"limit": limit, "offset": 0}
    while url:
        response = requests.get(
            url,
            params=params if "?" not in url else None,
            headers={"accept": "application/json"},
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        items.extend(payload["results"])
        url = payload.get("next")
        params = {}
    return items


def classify(title: str, category: str, tags: list[str]) -> str:
    text = " ".join([title, category, *tags]).lower()
    rules = [
        ("metal", ["metal", "steel", "iron", "aluminum", "aluminium", "copper", "bronze", "brass", "gold", "silver", "chrome", "rust", "titanium"]),
        ("glass", ["glass", "crystal", "window", "transparent", "ice"]),
        ("wood", ["wood", "oak", "walnut", "pine", "timber", "bark", "plank"]),
        ("textile", ["fabric", "linen", "velvet", "fleece", "leather", "cloth", "curtain", "carpet", "rug", "gingham", "herringbone", "tweed", "suede"]),
        ("stone", ["marble", "granite", "stone", "rock", "slate", "travertine", "limestone", "terrazzo"]),
        ("ceramic", ["tile", "ceramic", "porcelain", "glaze", "mosaic"]),
        ("concrete", ["concrete", "cement", "plaster", "stucco", "asphalt"]),
        ("ground", ["soil", "sand", "mud", "gravel", "flooring", "pavement", "brick", "cobble"]),
        ("wallpaper", ["wallpaper", "damask", "floral", "gatsby", "decor", "fresco"]),
        ("plastic", ["plastic", "rubber", "vinyl", "acrylic", "foam"]),
        ("liquid", ["water", "liquid", "oil", "alcohol", "honey"]),
        ("organic", ["leaf", "grass", "moss", "palm", "pine cones", "magnolia", "foliage"]),
    ]
    for family, needles in rules:
        if any(needle in text for needle in needles):
            return family
    return "surface"


def color_for(family: str, title: str) -> int:
    palette = {
        "metal": 0xB8BEC4,
        "glass": 0xC9F2FF,
        "wood": 0x8A542C,
        "textile": 0x6F7FA9,
        "stone": 0xC5C0B8,
        "ceramic": 0xDED8CE,
        "concrete": 0x9FA3A0,
        "ground": 0x8A745F,
        "wallpaper": 0x5B6FA8,
        "plastic": 0xE85D75,
        "liquid": 0x7FCFFF,
        "organic": 0x6FA85D,
        "surface": 0xB4B0AA,
    }
    text = title.lower()
    if "gold" in text:
        return 0xD8AD45
    if "copper" in text:
        return 0xC7774E
    if "rust" in text:
        return 0x9B4B2A
    if "black" in text:
        return 0x202225
    if "white" in text:
        return 0xF1EEE5
    if "red" in text or "maroon" in text:
        return 0xA7423F
    if "blue" in text or "indigo" in text or "cyan" in text:
        return 0x3F78BF
    if "green" in text or "olive" in text or "emerald" in text or "sage" in text:
        return 0x5F8F62
    if "yellow" in text or "khaki" in text:
        return 0xC7A85B
    return palette[family]


def pbr_defaults(family: str, title: str) -> dict:
    values = {"metalness": 0.0, "roughness": 0.55, "transmission": 0.0, "ior": 1.45, "clearcoat": 0.0, "clearcoatRoughness": 0.08}
    if family == "metal":
        values.update(metalness=1.0, roughness=0.24 if any(k in title.lower() for k in ("chrome", "polished")) else 0.42)
    elif family == "glass":
        values.update(roughness=0.04, transmission=0.92, ior=1.52, clearcoat=1.0)
    elif family == "wood":
        values.update(roughness=0.72)
    elif family == "textile":
        values.update(roughness=0.94)
    elif family == "stone":
        values.update(roughness=0.62, clearcoat=0.12)
    elif family == "ceramic":
        values.update(roughness=0.18, clearcoat=0.88, clearcoatRoughness=0.035)
    elif family == "concrete":
        values.update(roughness=0.9)
    elif family == "ground":
        values.update(roughness=0.86)
    elif family == "wallpaper":
        values.update(roughness=0.76)
    elif family == "plastic":
        values.update(roughness=0.28, clearcoat=0.36)
    elif family == "liquid":
        values.update(roughness=0.02, transmission=0.8, ior=1.333, clearcoat=1.0)
    elif family == "organic":
        values.update(roughness=0.78)
    return values


def unique_key(name: str, source: str = "GPUOpen MatLib") -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return f"{source.lower().replace(' ', '-')}-{normalized}"


def write_catalog() -> list[dict]:
    categories = {item["id"]: item["title"] for item in fetch_all("categories")}
    tags = {item["id"]: item["title"] for item in fetch_all("tags")}
    materials = fetch_all("materials")
    entries = []
    seen_keys: set[str] = set()
    duplicate_count = 0
    for index, material in enumerate(materials, 1):
        category = categories.get(material.get("category"), "Uncategorized")
        tag_names = [tags.get(tag, tag) for tag in material.get("tags") or []]
        family = classify(material["title"], category, tag_names)
        key = unique_key(material["title"])
        if material["id"] in seen_keys or key in seen_keys:
            duplicate_count += 1
            continue
        seen_keys.add(material["id"])
        seen_keys.add(key)
        entries.append({
            "id": material["id"],
            "uniqueKey": key,
            "index": len(entries) + 1,
            "sourceIndex": index,
            "name": material["title"],
            "family": family,
            "category": category,
            "tags": tag_names[:10],
            "license": material.get("license") or "",
            "source": "GPUOpen MatLib",
            "url": f"https://matlib.gpuopen.com/main/materials/all?id={material['id']}",
            "materialType": material.get("material_type") or "",
            "color": color_for(family, material["title"]),
            **pbr_defaults(family, material["title"]),
        })
    for entry in entries:
        entry["sourceCount"] = len(materials)
        entry["uniqueCount"] = len(entries)
    CATALOG.write_text("(function () {\n  window.meltmeshMaterialParkCatalog = " + json.dumps(entries, ensure_ascii=False, indent=2) + ";\n})();\n", encoding="utf-8")
    if duplicate_count:
        print(f"Skipped {duplicate_count} duplicate GPUOpen entries")
    return entries


def download_materials(names: list[str], resolution: str) -> None:
    from threejs_materials.library import gpuopen

    CACHE.mkdir(parents=True, exist_ok=True)
    for name in names:
        print(f"Downloading {name} at {resolution}...")
        gpuopen.download(name, resolution, CACHE)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog-only", action="store_true")
    parser.add_argument("--download", action="append", default=[], help="GPUOpen material title to download")
    parser.add_argument("--download-first", type=int, default=0, help="Download the first N catalog materials")
    parser.add_argument("--resolution", default="1K", choices=["1K", "2K", "4K"])
    args = parser.parse_args()

    entries = write_catalog()
    print(f"Wrote {len(entries)} GPUOpen material entries to {CATALOG}")

    names = list(args.download)
    if args.download_first:
        names.extend(entry["name"] for entry in entries[: args.download_first])
    if names and not args.catalog_only:
        download_materials(names, args.resolution)


if __name__ == "__main__":
    main()
