"""After a scan: "I recycled it" (confirm), "Not right?" (correct), and scan history."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.config import get_settings
from app.db import Database, ScanNotPending, get_db
from app.deps import get_current_user
from app.schemas import ClassifyResult, ConfirmResult, CorrectIn, ScanOut, ScanStatus
from app.services import badges, clock, discover, points, rules

router = APIRouter(prefix="/scans", tags=["scans"])


def owned_scan(db: Database, scan_id: UUID, user_id: str) -> dict:
    # The backend skips row-level security, so check ownership here
    scan = db.get_scan(str(scan_id))
    if scan is None or scan["user_id"] != user_id:
        raise HTTPException(404, "No scan with that id")
    return scan


def final_category(scan: dict) -> str:
    return scan["final_category_id"] or scan["category_id"]


@router.post("/{scan_id}/confirm", response_model=ConfirmResult)
def confirm(
    scan_id: UUID,
    user_id: str = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    scan = owned_scan(db, scan_id, user_id)
    if scan["status"] != ScanStatus.PENDING:
        raise HTTPException(409, "You already confirmed this scan")

    category_id = final_category(scan)
    if category_id not in rules.load_categories():
        raise HTTPException(400, "We couldn't tell what this was. Tap \"Not right?\" to pick it first.")

    corrected = scan["final_category_id"] is not None
    first_time = category_id not in db.confirmed_categories(user_id)
    duplicate = bool(scan["image_hash"]) and points.is_duplicate(
        scan["image_hash"], db.recent_confirmed_hashes()
    )
    bonus = 0 if duplicate else discover.bonus_for(category_id, corrected, db.confirmed_scans(user_id), clock.today())
    wanted = 0 if duplicate else points.points_for(category_id, corrected, first_time) + bonus

    try:
        result = db.award_points(
            str(scan_id), user_id, wanted, points.kg_for(category_id), get_settings().daily_point_cap
        )
    except ScanNotPending:
        # Two confirms raced; the database let only one through
        raise HTTPException(409, "You already confirmed this scan")

    notes = []
    if duplicate:
        notes.append("This photo was already used for points, so none this time. Thanks for sorting it!")
    elif result["awarded"] < wanted:
        notes.append(f"You've hit today's limit of {get_settings().daily_point_cap} points. Come back tomorrow!")
    else:
        if first_time and not corrected:
            notes.append(f"+{points.FIRST_CATEGORY_BONUS} bonus for your first {rules.get_disposal(category_id).name.lower()}!")
        if bonus:
            notes.append(f"+{bonus} Discover weekly bonus. You found this week's tricky item!")

    # Badges come from all confirmed scans, including this one
    new_badges = badges.new_badges(db.confirmed_scans(user_id), set(db.earned_badges(user_id)))
    db.add_badges(user_id, new_badges)
    notes += [f"New badge: {badges.BY_ID[b].name}!" for b in new_badges]

    return ConfirmResult(
        scan_id=str(scan_id),
        category_id=category_id,
        points_awarded=result["awarded"],
        total_points=result["total_points"],
        notes=notes,
        new_badges=new_badges,
    )


@router.post("/{scan_id}/correct", response_model=ClassifyResult)
def correct(
    scan_id: UUID,
    body: CorrectIn,
    user_id: str = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    if body.category_id not in rules.load_categories():
        raise HTTPException(422, f"No category called '{body.category_id}'")
    scan = owned_scan(db, scan_id, user_id)
    if scan["status"] != ScanStatus.PENDING:
        raise HTTPException(409, "You already confirmed this scan")

    scan = db.set_final_category(str(scan_id), body.category_id)

    disposal = rules.get_disposal(body.category_id)
    nearest = None
    if disposal.dropoff_type and body.lat is not None and body.lon is not None:
        nearest = rules.nearest_dropoff(body.lat, body.lon, disposal.dropoff_type)

    return ClassifyResult(
        **disposal.model_dump(exclude={"points"}),
        points=points.points_for(body.category_id, corrected=True, first_time=False),
        item=scan["item"],
        confidence=scan["confidence"],
        scan_id=str(scan_id),
        nearest_dropoff=nearest,
    )


@router.get("/me", response_model=list[ScanOut])
def my_scans(user_id: str = Depends(get_current_user), db: Database = Depends(get_db)):
    out = []
    for scan in db.list_scans(user_id):
        disposal = rules.get_disposal(final_category(scan))
        out.append(
            ScanOut(
                id=scan["id"],
                category_id=disposal.category_id,
                name=disposal.name,
                item=scan["item"],
                bin=disposal.bin,
                corrected=scan["final_category_id"] is not None,
                status=scan["status"],
                points_awarded=scan["points_awarded"],
                created_at=scan["created_at"],
                confirmed_at=scan["confirmed_at"],
            )
        )
    return out
