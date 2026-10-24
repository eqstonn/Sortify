"""How many points a confirmed scan is worth, and the "same photo twice" check.

The daily cap and "only once per scan" live in the award_points database
function (supabase/migrations/001_init.sql) so they happen in one step.
"""

import io

import imagehash
from PIL import Image

from app.services import rules

FIRST_CATEGORY_BONUS = 15  # first time you sort a new kind of item
# A corrected scan is worth at most this, so relabelling a chip bag as a
# battery can't earn rare-item points
CORRECTED_MAX_POINTS = 10
# Perceptual hashes are 64 bits; photos this close are the same picture
# (resized, re-compressed or slightly cropped)
DUPLICATE_MAX_DISTANCE = 6


def photo_hash(jpeg: bytes) -> str:
    """A fingerprint that stays the same when a photo is resized or re-saved."""
    with Image.open(io.BytesIO(jpeg)) as img:
        return str(imagehash.phash(img))


def is_duplicate(photo: str, earlier: list[str], max_distance: int = DUPLICATE_MAX_DISTANCE) -> bool:
    target = imagehash.hex_to_hash(photo)
    return any(target - imagehash.hex_to_hash(h) <= max_distance for h in earlier)


def points_for(category_id: str, corrected: bool, first_time: bool) -> int:
    base = rules.load_categories()[category_id].points
    if corrected:
        return min(base, CORRECTED_MAX_POINTS)
    return base + (FIRST_CATEGORY_BONUS if first_time else 0)


def kg_for(category_id: str) -> float:
    """Kg kept out of landfill. Garbage items still count as sorted, but not as diverted."""
    if not rules.get_disposal(category_id).recyclable:
        return 0.0
    return rules.load_categories()[category_id].kg_estimate


def apply_daily_cap(points: int, earned_today: int, cap: int) -> int:
    """Same rule as award_points in SQL (used by the fake database in tests)."""
    return max(0, min(points, cap - earned_today))
