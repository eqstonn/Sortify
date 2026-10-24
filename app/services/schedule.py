"""The next curbside pickup, for the Home "Up next" banner.

Ottawa rules: green bin every week; blue and black bins take turns each week;
a weekday holiday moves that day's pickup and the rest of the week one day later.
"""

import json
from datetime import date, timedelta
from functools import lru_cache

from app.schemas import Bin, NextPickup
from app.services import clock
from app.services.rules import DATA_DIR

BIN_WORDS = {Bin.BLUE: "Blue", Bin.BLACK: "Black"}


@lru_cache
def load_holidays() -> dict[date, str]:
    raw = json.loads((DATA_DIR / "holiday_shifts.json").read_text(encoding="utf-8"))
    return {date.fromisoformat(h["date"]): h["name"] for h in raw["holidays"]}


def recycling_bin(week_monday: date, blue_week_of: date) -> Bin:
    """Blue on even weeks counting from a known blue week, black on odd ones."""
    weeks = (week_monday - blue_week_of).days // 7
    return Bin.BLUE if weeks % 2 == 0 else Bin.BLACK


def pickup_in_week(monday: date, pickup_day: int, holidays: dict[date, str]) -> tuple[date, str | None]:
    """The real pickup date that week, after holiday shifts, and the holiday that moved it."""
    usual = monday + timedelta(days=pickup_day)
    # Every holiday from Monday up to and including the usual day pushes it back a day
    hits = [name for day, name in sorted(holidays.items()) if monday <= day <= usual]
    return usual + timedelta(days=len(hits)), (hits[0] if hits else None)


def next_pickup(
    today: date,
    pickup_day: int,
    blue_week_of: date,
    holidays: dict[date, str] | None = None,
) -> NextPickup:
    """pickup_day is 0 for Monday to 4 for Friday. Pickup day itself counts as "next"."""
    holidays = load_holidays() if holidays is None else holidays
    week = clock.week_start(today)
    day, holiday = pickup_in_week(week, pickup_day, holidays)
    if day < today:  # this week's pickup already happened
        week += timedelta(weeks=1)
        day, holiday = pickup_in_week(week, pickup_day, holidays)

    recycling = recycling_bin(week, blue_week_of)
    return NextPickup(
        pickup_date=day,
        days_away=(day - today).days,
        bins=[recycling, Bin.GREEN],
        label=f"{BIN_WORDS[recycling]} + green bin · {day:%a, %b} {day.day}",
        holiday=holiday,
    )
