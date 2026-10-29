"""Discover weekly: one tricky item each week, worth bonus points once.

The items in data/discover_weekly.json take turns, one per Ottawa week
(Monday to Sunday), starting at "first_week". The bonus is paid on the first
confirmed scan of that item in the week; later ones that week get none.
"""

import json
from datetime import date, timedelta
from functools import lru_cache

from app.schemas import DiscoverItem
from app.services import clock
from app.services.rules import DATA_DIR


@lru_cache
def load() -> tuple[date, list[DiscoverItem]]:
    raw = json.loads((DATA_DIR / "discover_weekly.json").read_text(encoding="utf-8"))
    return date.fromisoformat(raw["first_week"]), [DiscoverItem(**i) for i in raw["items"]]


def current(today: date) -> DiscoverItem:
    """This week's item."""
    first_week, items = load()
    weeks = (clock.week_start(today) - first_week).days // 7
    return items[weeks % len(items)]  # % also handles weeks before first_week


def found_this_week(scans: list[dict], today: date) -> bool:
    """Has the player already confirmed this week's item (and so used the bonus)?"""
    item = current(today)
    monday = clock.week_start(today)
    return any(
        (s["final_category_id"] or s["category_id"]) == item.category_id
        and clock.local_day(s["confirmed_at"]) >= monday
        for s in scans
    )


def bonus_for(category_id: str, corrected: bool, earlier_scans: list[dict], today: date) -> int:
    """Bonus points for confirming this scan. earlier_scans are the player's confirmed scans so far.

    Corrected scans get no bonus, otherwise anyone could relabel a chip bag as
    this week's item.
    """
    item = current(today)
    if corrected or category_id != item.category_id or found_this_week(earlier_scans, today):
        return 0
    return item.bonus_points


def week_bounds(today: date) -> tuple[date, date]:
    monday = clock.week_start(today)
    return monday, monday + timedelta(days=6)
