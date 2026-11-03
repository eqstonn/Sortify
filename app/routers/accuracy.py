"""GET /stats/accuracy: anonymized aggregate diagnostics for signed-in users."""

from fastapi import APIRouter, Depends

from app.db import Database, get_db
from app.deps import get_current_user
from app.schemas import AccuracyReport
from app.services.accuracy import accuracy_report

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/accuracy", response_model=AccuracyReport)
def accuracy(
    _user_id: str = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    return accuracy_report(db.accuracy_scans())
