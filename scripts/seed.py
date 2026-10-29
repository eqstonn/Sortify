"""Fill the leaderboard with 20 fake Ottawa players and their last 30 days of scans, for the demo.

    python -m scripts.seed            # add the players, or refresh them (safe to run again)
    python -m scripts.seed --remove   # delete them all after the demo

Each fake player is a login with an email like seed-01@example.com. Running it
again finds those same logins, wipes only their scans and badges, and makes a
fresh month ending today, so there are never duplicates and "This week" always
has data. Real players are never touched.

Points follow the real rules (base points, first-time bonus, daily cap), and
each profile's totals are set to exactly the sum of its scans.

Categories and drop-off sites aren't seeded: the backend reads them straight
from data/*.json. Run supabase/migrations/001 to 004 first.
"""

import argparse
import random
from dataclasses import dataclass
from datetime import datetime, time, timedelta

from app.config import load_settings
from app.db import get_db
from app.services import badges, clock, points, rules

DAYS = 30
EMAIL = "seed-{:02}@example.com"


@dataclass(frozen=True)
class FakePlayer:
    name: str
    avatar: str
    how_often: float  # chance they sort something on a given day
    most_per_day: int


# Busiest first, so the board has a clear spread from top to bottom
PLAYERS = [
    FakePlayer("Maya R.", "fox", 0.95, 5),
    FakePlayer("Jordan T.", "owl", 0.9, 5),
    FakePlayer("Priya S.", "flower", 0.9, 4),
    FakePlayer("Liam K.", "tree", 0.85, 4),
    FakePlayer("Émilie G.", "bee", 0.8, 4),
    FakePlayer("Noah B.", "cactus", 0.8, 3),
    FakePlayer("Amira H.", "leaf", 0.75, 3),
    FakePlayer("Chloe M.", "mushroom", 0.7, 3),
    FakePlayer("Mathieu B.", "turtle", 0.65, 3),
    FakePlayer("Fatima A.", "sprout", 0.6, 3),
    FakePlayer("Ethan G.", "fox", 0.55, 3),
    FakePlayer("Wei L.", "owl", 0.5, 3),
    FakePlayer("Sophie D.", "flower", 0.45, 2),
    FakePlayer("Daniel O.", "tree", 0.4, 2),
    FakePlayer("Isabelle T.", "bee", 0.35, 2),
    FakePlayer("Omar K.", "cactus", 0.3, 2),
    FakePlayer("Hannah C.", "leaf", 0.25, 2),
    FakePlayer("Lucas P.", "mushroom", 0.2, 2),
    FakePlayer("Zoe W.", "turtle", 0.15, 2),
    FakePlayer("Ava L.", "sprout", 0.1, 2),
]

# How often each category turns up: everyday recycling most, drop-off items rarely
WEIGHTS = {
    "plastic_bottle": 10, "plastic_container": 8, "plastic_jug": 3, "aluminum_can": 8,
    "steel_food_can": 4, "glass_bottle_jar": 5, "carton": 4, "drink_box": 3,
    "paper": 6, "cardboard": 6, "boxboard": 4, "paper_bag": 2, "food_scraps": 6,
    "soiled_paper": 2, "greasy_pizza_box": 2, "coffee_grounds_tea": 3, "chip_bag": 2,
    "coffee_cup": 3, "polystyrene_foam": 1, "plastic_bag_film": 1, "aerosol_can": 1,
    "battery": 0.5, "electronics": 0.4, "light_bulb": 0.3, "paint_chemical": 0.15,
}


def make_scans(player: FakePlayer, user_id: str, now: datetime, cap: int) -> list[dict]:
    """A month of confirmed scans for one player, oldest first, never later than `now`.
    The same player on the same day always gets the same scans."""
    rng = random.Random(f"{player.name}-{now.date()}")
    categories = rules.load_categories()
    today = now.astimezone(clock.OTTAWA).date()
    seen: set[str] = set()
    rows = []

    for day in (today - timedelta(days=n) for n in range(DAYS - 1, -1, -1)):
        if rng.random() > player.how_often:
            continue
        busiest = player.most_per_day + (1 if day.weekday() == 6 else 0)  # busy Sundays
        count = rng.randint(1, busiest)
        times = sorted(time(rng.randint(8, 21), rng.randint(0, 59)) for _ in range(count))
        earned_today = 0
        for at in times:
            when = datetime.combine(day, at, clock.OTTAWA)
            if when > now:
                break
            category_id = rng.choices(list(WEIGHTS), weights=list(WEIGHTS.values()))[0]
            wanted = points.points_for(category_id, corrected=False, first_time=category_id not in seen)
            awarded = points.apply_daily_cap(wanted, earned_today, cap)
            seen.add(category_id)
            earned_today += awarded
            category = categories[category_id]
            rows.append({
                "user_id": user_id,
                "category_id": category_id,
                "item": rng.choice(category.examples or [category.name]),
                "confidence": round(rng.uniform(0.75, 0.99), 2),
                "status": "confirmed",
                "points_awarded": awarded,
                "kg_diverted": points.kg_for(category_id),
                "created_at": when - timedelta(seconds=20),
                "confirmed_at": when,
            })
    return rows


def seed(db, now: datetime, cap: int) -> list[dict]:
    """Adds or refreshes every fake player. Returns one summary per player."""
    summary = []
    for n, player in enumerate(PLAYERS, start=1):
        email = EMAIL.format(n)
        user_id = db.find_user(email) or db.create_user(email)
        db.delete_scans(user_id)
        db.delete_badges(user_id)

        rows = make_scans(player, user_id, now, cap)
        db.insert_scans(rows)
        total = sum(r["points_awarded"] for r in rows)
        db.update_profile(user_id, {
            "name": player.name,
            "avatar": player.avatar,
            "total_points": total,
            "items_sorted": len(rows),
            "kg_diverted": round(sum(r["kg_diverted"] for r in rows), 3),
        })
        earned = badges.new_badges([{**r, "final_category_id": None} for r in rows], set())
        db.add_badges(user_id, earned)
        summary.append({"name": player.name, "scans": len(rows), "points": total, "badges": earned})
    return summary


def remove(db) -> int:
    """Deletes every fake player (their scans and badges go with them). Returns how many."""
    removed = 0
    for n in range(1, len(PLAYERS) + 1):
        user_id = db.find_user(EMAIL.format(n))
        if user_id:
            db.delete_user(user_id)
            removed += 1
    return removed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--remove", action="store_true", help="delete the fake players instead")
    args = parser.parse_args()

    settings = load_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise SystemExit("Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env first.")
    db = get_db()

    if args.remove:
        print(f"Removed {remove(db)} fake players.")
        return

    now = datetime.now(clock.OTTAWA)
    for row in seed(db, now, settings.daily_point_cap):
        badge_names = ", ".join(badges.BY_ID[b].name for b in row["badges"]) or "-"
        print(f"{row['name']:<12} {row['scans']:>3} scans {row['points']:>5} pts   badges: {badge_names}")
    print(f"\nSeeded {len(PLAYERS)} players with the {DAYS} days up to {now:%b %d}. Open the Board tab.")


if __name__ == "__main__":
    main()
