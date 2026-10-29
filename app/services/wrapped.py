"""Sortify Wrapped: a player's month in numbers.

Most functions take the month's confirmed scans by everyone, as
Database.scans_between returns them: dicts with user_id, category_id,
final_category_id, item, points_awarded, kg_diverted and confirmed_at.
Months use Ottawa time (clock.month_bounds).
"""

import calendar
from collections import Counter, defaultdict
from datetime import date

from app.schemas import MaterialCount, RarestFind
from app.services import clock, rules, stats

TOP_MATERIALS = 5
RARITY_ORDER = {"common": 0, "uncommon": 1, "rare": 2}


def category_of(scan: dict) -> str:
    return scan["final_category_id"] or scan["category_id"]


def known(scans: list[dict]) -> list[dict]:
    """Scans whose category is in categories.json (confirmed scans always are, but be safe)."""
    categories = rules.load_categories()
    return [s for s in scans if category_of(s) in categories]


def total_kg(scans: list[dict]) -> float:
    return round(sum(float(s["kg_diverted"]) for s in scans), 2)


def average_kg(month_scans: list[dict]) -> float:
    """Kg per player who sorted anything this month (for "double the average")."""
    players = {s["user_id"] for s in month_scans}
    return round(total_kg(month_scans) / len(players), 2) if players else 0.0


def top_materials(scans: list[dict], limit: int = TOP_MATERIALS) -> list[MaterialCount]:
    categories = rules.load_categories()
    by_material: dict[str, Counter] = defaultdict(Counter)
    for s in known(scans):
        category = categories[category_of(s)]
        by_material[category.material][category.name] += 1

    # Most items first; ties in alphabetical order so the answer never wobbles
    ordered = sorted(by_material.items(), key=lambda kv: (-sum(kv[1].values()), kv[0]))
    return [
        MaterialCount(
            material=material,
            count=sum(names.values()),
            top_items=[name for name, _ in sorted(names.items(), key=lambda kv: (-kv[1], kv[0]))[:2]],
        )
        for material, names in ordered[:limit]
    ]


def rarest_find(my_scans: list[dict], month_scans: list[dict]) -> RarestFind | None:
    """The rarest category you sorted; ties go to more points, then the earliest scan."""
    mine = sorted(known(my_scans), key=lambda s: s["confirmed_at"])
    if not mine:
        return None
    categories = rules.load_categories()

    def rareness(s):
        category = categories[category_of(s)]
        return RARITY_ORDER.get(category.rarity, 0), category.points

    best = max(mine, key=rareness)  # max keeps the first (earliest) of equals
    category = categories[category_of(best)]

    players = {s["user_id"] for s in month_scans}
    found_it = {s["user_id"] for s in month_scans if category_of(s) == category.id}
    return RarestFind(
        category_id=category.id,
        name=category.name,
        item=best["item"] or category.name,
        material=category.material,
        bin=category.bin,
        rarity=category.rarity,
        percent_of_players=round(100 * len(found_it) / len(players)),
    )


def ranking(month_scans: list[dict]) -> list[dict]:
    """Players by points this month: [{"user_id", "points", "rank"}], best first.

    Same rules as the leaderboard views: equal points share a rank, players
    with 0 points aren't ranked.
    """
    totals: Counter = Counter()
    for s in month_scans:
        totals[s["user_id"]] += s["points_awarded"]
    ordered = sorted(((uid, pts) for uid, pts in totals.items() if pts > 0), key=lambda t: (-t[1], t[0]))

    rows = []
    for uid, pts in ordered:
        rank = rows[-1]["rank"] if rows and rows[-1]["points"] == pts else len(rows) + 1
        rows.append({"user_id": uid, "points": pts, "rank": rank})
    return rows


def busiest_day(scans: list[dict]) -> str | None:
    """The weekday you sorted most items on, e.g. "sunday". Ties go to the earlier weekday."""
    counts = Counter(clock.local_day(s["confirmed_at"]).weekday() for s in scans)
    if not counts:
        return None
    weekday = min(counts, key=lambda d: (-counts[d], d))
    return calendar.day_name[weekday].lower()


def longest_streak(days: set[date], first_day: date, last_day: date) -> int:
    """The longest run of days in a row that touches this month, counted in full.

    A streak from Sep 28 to Oct 3 counts as 6 days in both September's and
    October's Wrapped, because that's how long the streak really was.
    """
    return max(
        (stats.run_length(r) for r in stats.runs(days) if r[0] <= last_day and r[1] >= first_day),
        default=0,
    )
