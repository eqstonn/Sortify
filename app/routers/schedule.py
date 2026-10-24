"""The Home "Up next" pickup banner, and where the player sets their pickup day."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException

from app.db import Database, get_db
from app.deps import get_current_user
from app.routers.profile import get_profile_or_404
from app.schemas import NextPickup, RecyclingWeek, ScheduleIn, Weekday
from app.services import clock, schedule

router = APIRouter(tags=["schedule"])


@router.get("/schedule/next", response_model=NextPickup)
def next_pickup(user_id: str = Depends(get_current_user), db: Database = Depends(get_db)):
    profile = get_profile_or_404(db, user_id)
    if profile["pickup_day"] is None or profile["blue_week_of"] is None:
        raise HTTPException(404, "Set your pickup day first (PUT /me/schedule)")
    return schedule.next_pickup(clock.today(), profile["pickup_day"], profile["blue_week_of"])


@router.put("/me/schedule", response_model=NextPickup)
def set_schedule(
    body: ScheduleIn,
    user_id: str = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    get_profile_or_404(db, user_id)
    # Store a Monday of a blue week: this week if blue goes out now, otherwise last week
    this_monday = clock.week_start(clock.today())
    blue_week_of = this_monday if body.this_week == RecyclingWeek.BLUE else this_monday - timedelta(weeks=1)
    pickup_day = list(Weekday).index(body.pickup_day)

    db.update_profile(user_id, {"pickup_day": pickup_day, "blue_week_of": blue_week_of})
    return schedule.next_pickup(clock.today(), pickup_day, blue_week_of)
