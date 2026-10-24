"""GET /leaderboard: the Board screen's "This week" and "All time" tabs."""

from fastapi import APIRouter, Depends, Query

from app.db import Database, get_db
from app.deps import get_current_user
from app.schemas import LeaderboardEntry, LeaderboardOut, LeaderboardRange

router = APIRouter(tags=["leaderboard"])

TOP = 20


def to_entry(row: dict, user_id: str) -> LeaderboardEntry:
    return LeaderboardEntry(**row, is_me=row["user_id"] == user_id)


@router.get("/leaderboard", response_model=LeaderboardOut)
def leaderboard(
    period: LeaderboardRange = Query(LeaderboardRange.WEEK, alias="range"),
    user_id: str = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    entries = [to_entry(row, user_id) for row in db.leaderboard(period.value, TOP)]

    # Your own row, even when you're 35th and not in the top 20
    me = next((e for e in entries if e.is_me), None)
    if me is None:
        row = db.leaderboard_entry(period.value, user_id)
        me = to_entry(row, user_id) if row else None

    return LeaderboardOut(range=period, entries=entries, me=me)
