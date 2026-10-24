"""Ottawa disposal rules: category -> bin, points and tips, plus nearest drop-off.

The bin always comes from data/categories.json, never from Gemini's own words.
"""

import json
import math
from functools import lru_cache
from pathlib import Path

from app.schemas import Bin, Category, Disposal, DropoffSite, DropoffType, NearestDropoff

DATA_DIR = Path(__file__).resolve().parents[2] / "data"

RECYCLABLE_BINS = {Bin.BLUE, Bin.BLACK, Bin.GREEN, Bin.DROPOFF}

UNKNOWN = Disposal(
    category_id="unknown",
    name="Not sure",
    material="unknown",
    recyclable=False,
    bin=Bin.UNSURE,
    points=0,
    tips=[
        "We couldn't tell what this is. Try another photo with just one item in the frame.",
        "You can also search the item on ottawa.ca.",
    ],
)


@lru_cache
def load_categories() -> dict[str, Category]:
    raw = json.loads((DATA_DIR / "categories.json").read_text(encoding="utf-8"))
    categories = [Category(**c) for c in raw["categories"]]
    return {c.id: c for c in categories}


@lru_cache
def load_sites() -> list[DropoffSite]:
    raw = json.loads((DATA_DIR / "dropoff_sites.json").read_text(encoding="utf-8"))
    return [DropoffSite(**s) for s in raw["sites"]]


def category_ids() -> list[str]:
    """The fixed list Gemini must choose from (phase 2)."""
    return list(load_categories())


def get_disposal(category_id: str) -> Disposal:
    category = load_categories().get(category_id)
    if category is None:
        return UNKNOWN
    return Disposal(
        category_id=category.id,
        name=category.name,
        material=category.material,
        recyclable=category.bin in RECYCLABLE_BINS,
        bin=category.bin,
        dropoff_type=category.dropoff_type,
        points=category.points,
        tips=category.tips,
    )


def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance (haversine)."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest_dropoff(
    lat: float,
    lon: float,
    accepts: DropoffType | None = None,
    sites: list[DropoffSite] | None = None,
) -> NearestDropoff | None:
    candidates = sites if sites is not None else load_sites()
    if accepts is not None:
        candidates = [s for s in candidates if accepts in s.accepts]
    if not candidates:
        return None
    best = min(candidates, key=lambda s: distance_km(lat, lon, s.lat, s.lon))
    return NearestDropoff(site=best, distance_km=round(distance_km(lat, lon, best.lat, best.lon), 1))
