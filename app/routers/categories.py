"""Read-only endpoints for the Ottawa rules, handy for the app and for checking data at /docs."""

from fastapi import APIRouter, HTTPException, Query

from app.schemas import Category, Disposal, DropoffType, NearestDropoff
from app.services import rules

router = APIRouter(tags=["rules"])


@router.get("/categories", response_model=list[Category])
def list_categories():
    return list(rules.load_categories().values())


@router.get("/categories/{category_id}", response_model=Disposal)
def get_category(category_id: str):
    disposal = rules.get_disposal(category_id)
    if disposal.category_id == "unknown":
        raise HTTPException(404, f"No category called '{category_id}'")
    return disposal


@router.get("/dropoffs/nearest", response_model=NearestDropoff)
def nearest(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    accepts: DropoffType | None = None,
):
    result = rules.nearest_dropoff(lat, lon, accepts)
    if result is None:
        raise HTTPException(404, "No drop-off site accepts that yet")
    return result
