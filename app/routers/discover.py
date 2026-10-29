"""GET /discover/current: this week's tricky item and its bonus."""

from fastapi import APIRouter, Depends

from app.db import Database, get_db
from app.deps import get_current_user
from app.schemas import DiscoverOut
from app.services import clock, discover, rules

router = APIRouter(tags=["discover"])


@router.get("/discover/current", response_model=DiscoverOut)
def current(user_id: str = Depends(get_current_user), db: Database = Depends(get_db)):
    today = clock.today()
    item = discover.current(today)
    category = rules.load_categories()[item.category_id]
    week_of, ends_on = discover.week_bounds(today)
    return DiscoverOut(
        week_of=week_of,
        ends_on=ends_on,
        category_id=item.category_id,
        item=item.item,
        name=category.name,
        bin=category.bin,
        bonus_points=item.bonus_points,
        explainer=item.explainer,
        tips=category.tips,
        found=discover.found_this_week(db.confirmed_scans(user_id), today),
    )
