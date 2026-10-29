"""GET /wrapped/{year}/{month}: everything the 5 Sortify Wrapped cards show."""

from datetime import timedelta

from fastapi import APIRouter, Depends, Path

from app.db import Database, get_db
from app.deps import get_current_user
from app.schemas import TopRecycler, WrappedOut
from app.services import clock, stats, wrapped

router = APIRouter(tags=["wrapped"])


@router.get("/wrapped/{year}/{month}", response_model=WrappedOut)
def get_wrapped(
    year: int = Path(ge=2024, le=2100),
    month: int = Path(ge=1, le=12),
    user_id: str = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    start, end = clock.month_bounds(year, month)
    month_scans = db.scans_between(start, end)  # everyone's, for rank and "x% of players"
    mine = [s for s in month_scans if s["user_id"] == user_id]

    ranking = wrapped.ranking(month_scans)
    my_row = next((r for r in ranking if r["user_id"] == user_id), None)

    top_recycler = None
    if ranking:
        top = ranking[0]
        profile = db.get_profile(top["user_id"]) or {}
        top_recycler = TopRecycler(
            user_id=top["user_id"],
            name=profile.get("name", "Recycler"),
            avatar=profile.get("avatar", "sprout"),
            points=top["points"],
            is_me=top["user_id"] == user_id,
        )

    # All your scan days, so a streak that crosses into the next or previous month counts in full
    my_days = stats.scan_days(db.confirmed_scans(user_id))
    first_day, last_day = start.date(), end.date() - timedelta(days=1)

    return WrappedOut(
        year=year,
        month=month,
        items=len(mine),
        kg=wrapped.total_kg(mine),
        average_kg=wrapped.average_kg(month_scans),
        points=sum(s["points_awarded"] for s in mine),
        top_materials=wrapped.top_materials(mine),
        rarest_find=wrapped.rarest_find(mine, month_scans),
        rank=my_row["rank"] if my_row else None,
        players=len({s["user_id"] for s in month_scans}),
        top_recycler=top_recycler,
        busiest_day=wrapped.busiest_day(mine),
        longest_streak=wrapped.longest_streak(my_days, first_day, last_day),
    )
