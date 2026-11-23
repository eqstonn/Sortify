"""GET /me and PATCH /me: everything the Home and Me screens show about a player.
POST /me/avatar and DELETE /me/avatar: the profile photo."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.db import Database, get_db
from app.deps import get_current_user
from app.schemas import BadgeOut, ProfileOut, ProfileUpdate, Schedule, Weekday
from app.services import badges, clock, images, levels, stats

router = APIRouter(tags=["profile"])


def get_profile_or_404(db: Database, user_id: str) -> dict:
    # Supabase makes a profile when someone first signs in (001_init.sql)
    profile = db.get_profile(user_id)
    if profile is None:
        raise HTTPException(404, "No profile yet. Sign in again.")
    return profile


def build_profile(db: Database, user_id: str) -> ProfileOut:
    profile = get_profile_or_404(db, user_id)
    scans = db.confirmed_scans(user_id)
    today = clock.today()
    current_streak, longest_streak = stats.streaks(stats.scan_days(scans), today)
    rank_row = db.leaderboard_entry("all", user_id)

    schedule = None
    if profile["pickup_day"] is not None and profile["blue_week_of"] is not None:
        schedule = Schedule(pickup_day=list(Weekday)[profile["pickup_day"]], blue_week_of=profile["blue_week_of"])

    return ProfileOut(
        id=profile["id"],
        name=profile["name"],
        avatar=profile["avatar"],
        total_points=profile["total_points"],
        level=levels.level_for(profile["total_points"]),
        items_sorted=profile["items_sorted"],
        kg_diverted=round(float(profile["kg_diverted"]), 2),
        items_this_week=stats.items_since(scans, clock.week_start(today)),
        current_streak=current_streak,
        longest_streak=longest_streak,
        rank=rank_row["rank"] if rank_row else None,
        breakdown=stats.material_breakdown(scans),
        schedule=schedule,
        badges=badge_list(db.earned_badges(user_id)),
    )


def badge_list(earned: dict) -> list[BadgeOut]:
    """Every badge, earned ones first, then the locked ones (each in badges.BADGES order)."""
    out = [
        BadgeOut(id=b.id, name=b.name, description=b.description, earned=b.id in earned, earned_at=earned.get(b.id))
        for b in badges.BADGES
    ]
    return sorted(out, key=lambda b: not b.earned)  # sorted() keeps ties in order


@router.get("/me", response_model=ProfileOut)
def get_me(user_id: str = Depends(get_current_user), db: Database = Depends(get_db)):
    return build_profile(db, user_id)


@router.patch("/me", response_model=ProfileOut)
def update_me(
    body: ProfileUpdate,
    user_id: str = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    get_profile_or_404(db, user_id)
    changes = body.model_dump(exclude_none=True, mode="json")  # mode="json" turns Avatar.FOX into "fox"
    if changes:
        db.update_profile(user_id, changes)
    return build_profile(db, user_id)


MAX_PHOTO_BYTES = 10 * 1024 * 1024
DEFAULT_AVATAR = "sprout"  # the profiles.avatar default; the app shows the grey default person for it


@router.post("/me/avatar", response_model=ProfileOut)
def upload_avatar(
    image: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Set a profile photo. It's cropped square, shrunk and has its location removed before it's saved."""
    get_profile_or_404(db, user_id)
    data = image.file.read(MAX_PHOTO_BYTES + 1)
    if not data:
        raise HTTPException(400, "Empty image")
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(413, "Image is too big (max 10 MB)")
    try:
        photo = images.prepare_avatar(data)
    except images.InvalidImage as e:
        raise HTTPException(400, str(e))
    db.update_profile(user_id, {"avatar": db.upload_avatar(user_id, photo)})
    return build_profile(db, user_id)


@router.delete("/me/avatar", response_model=ProfileOut)
def remove_avatar(user_id: str = Depends(get_current_user), db: Database = Depends(get_db)):
    """Back to the default picture."""
    profile = get_profile_or_404(db, user_id)
    if profile["avatar"].startswith("http"):
        db.delete_avatar(user_id)
    db.update_profile(user_id, {"avatar": DEFAULT_AVATAR})
    return build_profile(db, user_id)
