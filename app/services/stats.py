"""Career stats from a player's confirmed scans: this week, streaks, "What you sort".

Each scan is a dict with category_id, final_category_id and confirmed_at, as
Database.confirmed_scans returns them.
"""

from collections import Counter
from datetime import date, timedelta

from app.schemas import MaterialShare
from app.services import clock, rules


def scan_days(scans: list[dict]) -> set[date]:
    """The Ottawa days on which the player confirmed at least one scan."""
    return {clock.local_day(s["confirmed_at"]) for s in scans}


def items_since(scans: list[dict], start: date) -> int:
    return sum(1 for s in scans if clock.local_day(s["confirmed_at"]) >= start)


def runs(days: set[date]) -> list[tuple[date, date]]:
    """Every run of days in a row, as (first day, last day), oldest first."""
    out = []
    for day in sorted(days):
        if day - timedelta(days=1) in days:
            continue  # not the start of a run
        last = day
        while last + timedelta(days=1) in days:
            last += timedelta(days=1)
        out.append((day, last))
    return out


def run_length(run: tuple[date, date]) -> int:
    return (run[1] - run[0]).days + 1


def streaks(days: set[date], today: date) -> tuple[int, int]:
    """(current streak, longest streak) in days.

    The current streak is still alive if the last scan was yesterday, so it
    doesn't drop to 0 every morning before you've scanned anything.
    """
    longest = max((run_length(r) for r in runs(days)), default=0)

    end = today if today in days else today - timedelta(days=1)
    current = 0
    while end - timedelta(days=current) in days:
        current += 1
    return current, longest


def material_breakdown(scans: list[dict]) -> list[MaterialShare]:
    categories = rules.load_categories()
    counts = Counter(
        categories[cid].material
        for s in scans
        if (cid := s["final_category_id"] or s["category_id"]) in categories
    )
    total = sum(counts.values())
    return [
        MaterialShare(material=material, count=count, percent=round(100 * count / total))
        for material, count in counts.most_common()
    ]
