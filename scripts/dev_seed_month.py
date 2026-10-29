"""Fill one account with a month of fake confirmed scans, so Wrapped has something to show.

    python -m scripts.dev_seed_month <user id>                      # this month, up to today
    python -m scripts.dev_seed_month <user id> --year 2026 --month 9

Your user id is the "id" in GET /me (or the one scripts.dev_token printed).
Points follow the real rules (base points, first-time bonus, daily cap) and
the profile totals and badges are updated to match. It won't seed a month
that already has confirmed scans unless you pass --force, so running it
twice by accident doesn't double your points.

Run supabase/migrations/003_badges.sql first.
"""

import argparse
import random
from datetime import datetime, time, timedelta

from app.config import load_settings
from app.db import get_db
from app.services import badges, clock, points, rules

# How often each category turns up (plastic most, rare drop-off items least)
WEIGHTS = {
    "plastic_bottle": 10, "plastic_container": 8, "plastic_jug": 3, "aluminum_can": 7,
    "steel_food_can": 4, "glass_bottle_jar": 5, "carton": 4, "drink_box": 3,
    "paper": 6, "cardboard": 6, "boxboard": 4, "food_scraps": 5, "greasy_pizza_box": 2,
    "coffee_grounds_tea": 3, "chip_bag": 2, "coffee_cup": 2, "plastic_bag_film": 1,
}


def plan_days(rng: random.Random, first: datetime, last: datetime) -> list:
    """The days to scan on: most days, with a solid 8-day streak in the middle."""
    days = []
    day = first.date()
    streak_start = first.date() + timedelta(days=min(5, (last.date() - first.date()).days // 3))
    while day <= last.date():
        in_streak = streak_start <= day < streak_start + timedelta(days=8)
        if in_streak or rng.random() < 0.6:
            days.append(day)
        day += timedelta(days=1)
    return days


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("user_id")
    today = clock.today()
    parser.add_argument("--year", type=int, default=today.year)
    parser.add_argument("--month", type=int, default=today.month)
    parser.add_argument("--force", action="store_true", help="seed even if the month already has scans")
    args = parser.parse_args()

    settings = load_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise SystemExit("Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env first.")
    db = get_db()

    profile = db.get_profile(args.user_id)
    if profile is None:
        raise SystemExit(f"No profile with id {args.user_id}. Sign in once in the app (or run scripts.dev_token).")

    start, end = clock.month_bounds(args.year, args.month)
    if start.date() > today:
        raise SystemExit("That month hasn't started yet.")
    already = [s for s in db.scans_between(start, end) if s["user_id"] == args.user_id]
    if already and not args.force:
        raise SystemExit(f"{len(already)} scans already in {args.year}-{args.month:02}. Pass --force to add more anyway.")

    last_day = min(end - timedelta(days=1), datetime.combine(today, time(), clock.OTTAWA))
    rng = random.Random(f"{args.user_id}-{args.year}-{args.month}")  # same month, same fake scans
    categories = rules.load_categories()
    seen = db.confirmed_categories(args.user_id)

    days = plan_days(rng, start, last_day)
    # A few rare drop-off finds: an old charger on day one, a battery a third of the way in
    extras = {days[0]: ["electronics"], days[len(days) // 3]: ["battery"]}

    rows = []
    for day in days:
        count = rng.randint(2, 5) if day.weekday() == 6 else rng.randint(1, 3)  # busy Sundays
        picks = rng.choices(list(WEIGHTS), weights=list(WEIGHTS.values()), k=count) + extras.get(day, [])
        earned_today = 0
        for category_id in picks:
            first_time = category_id not in seen
            seen.add(category_id)
            wanted = points.points_for(category_id, corrected=False, first_time=first_time)
            awarded = points.apply_daily_cap(wanted, earned_today, settings.daily_point_cap)
            earned_today += awarded
            when = datetime.combine(day, time(rng.randint(8, 21), rng.randint(0, 59)), clock.OTTAWA)
            if category_id == "battery":
                item = "old laptop battery"
            else:
                item = rng.choice(categories[category_id].examples or [categories[category_id].name])
            rows.append({
                "user_id": args.user_id,
                "category_id": category_id,
                "item": item,
                "confidence": round(rng.uniform(0.75, 0.99), 2),
                "status": "confirmed",
                "points_awarded": awarded,
                "kg_diverted": points.kg_for(category_id),
                "created_at": when.isoformat(),
                "confirmed_at": (when + timedelta(seconds=20)).isoformat(),
            })

    print(f"Adding {len(rows)} scans to {profile['name']} for {args.year}-{args.month:02}...")
    for row in rows:
        db.insert_scan(row)

    added_points = sum(r["points_awarded"] for r in rows)
    added_kg = sum(r["kg_diverted"] for r in rows)
    db.update_profile(args.user_id, {
        "total_points": profile["total_points"] + added_points,
        "items_sorted": profile["items_sorted"] + len(rows),
        "kg_diverted": round(float(profile["kg_diverted"]) + added_kg, 3),
    })

    new = badges.new_badges(db.confirmed_scans(args.user_id), set(db.earned_badges(args.user_id)))
    db.add_badges(args.user_id, new)

    print(f"Done: +{added_points} points, +{added_kg:.2f} kg.")
    if new:
        print("New badges: " + ", ".join(badges.BY_ID[b].name for b in new))
    print(f"Open GET /wrapped/{args.year}/{args.month} at /docs to see it.")


if __name__ == "__main__":
    main()
