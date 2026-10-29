"""Badge rules: which badges a player's confirmed scans have earned.

Each badge is awarded once. The badges table (supabase/migrations/003_badges.sql)
has one row per (player, badge), so even two confirms at the same moment can't
award it twice. A badge stays earned even if the rule would no longer hold.
"""

from dataclasses import dataclass

from app.services import rules, stats

E_WASTE = {"electronics", "battery"}
E_WASTE_HERO_COUNT = 3
GLASS_MASTER_COUNT = 10  # blue-bin glass bottles and jars
STREAK_DAYS = 7


@dataclass(frozen=True)
class Badge:
    id: str
    name: str
    description: str


# In the order the Me screen shows them
BADGES = [
    Badge("first_sort", "First sort", "Sort your first item"),
    Badge("ewaste_hero", "E-waste hero", f"Take {E_WASTE_HERO_COUNT} electronics or batteries to a drop-off"),
    Badge("streak_7", "7-day streak", f"Sort something {STREAK_DAYS} days in a row"),
    Badge("glass_master", "Glass master", f"Sort {GLASS_MASTER_COUNT} glass bottles or jars"),
]
BY_ID = {b.id: b for b in BADGES}


def earned_ids(scans: list[dict]) -> set[str]:
    """Badges these confirmed scans qualify for (as Database.confirmed_scans returns them)."""
    categories = [s["final_category_id"] or s["category_id"] for s in scans]
    categories = [c for c in categories if c in rules.load_categories()]
    longest = max((stats.run_length(r) for r in stats.runs(stats.scan_days(scans))), default=0)

    earned = set()
    if categories:
        earned.add("first_sort")
    if sum(c in E_WASTE for c in categories) >= E_WASTE_HERO_COUNT:
        earned.add("ewaste_hero")
    if longest >= STREAK_DAYS:
        earned.add("streak_7")
    if categories.count("glass_bottle_jar") >= GLASS_MASTER_COUNT:
        earned.add("glass_master")
    return earned


def new_badges(scans: list[dict], already: set[str]) -> list[str]:
    """Badge ids the scans have earned that the player doesn't have yet, in display order."""
    earned = earned_ids(scans)
    return [b.id for b in BADGES if b.id in earned and b.id not in already]
