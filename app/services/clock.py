"""Ottawa time. Days, weeks and streaks all use Ottawa's calendar, not UTC.

Tests replace today() to pretend it's a particular day.
"""

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

OTTAWA = ZoneInfo("America/Toronto")  # Ottawa shares Toronto's time zone


def today() -> date:
    return datetime.now(OTTAWA).date()


def local_day(ts: datetime) -> date:
    """The Ottawa calendar day of a timestamp (a scan at 11pm EST is 4am UTC the next day)."""
    return ts.astimezone(OTTAWA).date()


def week_start(day: date) -> date:
    """The Monday of that day's week."""
    return day - timedelta(days=day.weekday())


def month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    """Midnight Ottawa time on the 1st of the month, and on the 1st of the next month."""
    start = datetime(year, month, 1, tzinfo=OTTAWA)
    end = datetime(year + month // 12, month % 12 + 1, 1, tzinfo=OTTAWA)
    return start, end
