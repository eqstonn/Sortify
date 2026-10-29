"""The only code that talks to Supabase.

Routers get a Database through the get_db dependency. Tests swap in
tests/fakes.py:FakeDB, which has the same methods, so pytest runs offline.
"""

from datetime import date, datetime
from functools import lru_cache

from fastapi import HTTPException
from supabase import ClientOptions, create_client
from supabase_auth.errors import AuthError

from app.config import get_settings

# Supabase returns at most 1000 rows per request; the duplicate-photo check
# looks at this many of the most recent confirmed scans.
RECENT_HASHES = 1000

# GET /leaderboard?range=... -> the view in 001_init.sql
LEADERBOARD_VIEWS = {"week": "leaderboard_week", "all": "leaderboard_all_time"}


class ScanNotPending(Exception):
    """award_points refused: the scan is already confirmed or isn't this player's."""


class Database:
    def __init__(self, client):
        self.client = client

    # ---------- auth ----------

    def user_id_from_token(self, token: str) -> str | None:
        """Asks Supabase whether a login token is real. Returns the user id or None."""
        try:
            res = self.client.auth.get_user(token)
        except AuthError:
            return None
        return res.user.id if res and res.user else None

    # ---------- scans ----------

    def insert_scan(self, row: dict) -> dict:
        return self.client.table("scans").insert(row).execute().data[0]

    def get_scan(self, scan_id: str) -> dict | None:
        rows = self.client.table("scans").select("*").eq("id", scan_id).limit(1).execute().data
        return rows[0] if rows else None

    def set_final_category(self, scan_id: str, category_id: str) -> dict:
        res = (
            self.client.table("scans")
            .update({"final_category_id": category_id})
            .eq("id", scan_id)
            .execute()
        )
        return res.data[0]

    def list_scans(self, user_id: str, limit: int = 50) -> list[dict]:
        res = (
            self.client.table("scans")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data

    def confirmed_categories(self, user_id: str) -> set[str]:
        """Every category this player has already had points for."""
        res = (
            self.client.table("scans")
            .select("category_id, final_category_id")
            .eq("user_id", user_id)
            .eq("status", "confirmed")
            .execute()
        )
        return {r["final_category_id"] or r["category_id"] for r in res.data}

    def recent_confirmed_hashes(self) -> list[str]:
        """Photo hashes of recent confirmed scans by anyone (sharing a photo doesn't work either)."""
        res = (
            self.client.table("scans")
            .select("image_hash")
            .eq("status", "confirmed")
            .not_.is_("image_hash", "null")
            .order("confirmed_at", desc=True)
            .limit(RECENT_HASHES)
            .execute()
        )
        return [r["image_hash"] for r in res.data]

    def confirmed_scans(self, user_id: str) -> list[dict]:
        """This player's confirmed scans (up to 1000), newest first, for profile stats."""
        res = (
            self.client.table("scans")
            .select("category_id, final_category_id, points_awarded, confirmed_at")
            .eq("user_id", user_id)
            .eq("status", "confirmed")
            .order("confirmed_at", desc=True)
            .limit(1000)
            .execute()
        )
        for row in res.data:
            row["confirmed_at"] = datetime.fromisoformat(row["confirmed_at"])
        return res.data

    def scans_between(self, start: datetime, end: datetime) -> list[dict]:
        """Everyone's confirmed scans with start <= confirmed_at < end, for Wrapped."""
        rows: list[dict] = []
        while True:  # Supabase sends 1000 rows at a time
            page = (
                self.client.table("scans")
                .select("user_id, category_id, final_category_id, item, points_awarded, kg_diverted, confirmed_at")
                .eq("status", "confirmed")
                .gte("confirmed_at", start.isoformat())
                .lt("confirmed_at", end.isoformat())
                .order("confirmed_at")
                .order("id")  # a fixed order so pages don't overlap
                .range(len(rows), len(rows) + 999)
                .execute()
                .data
            )
            rows.extend(page)
            if len(page) < 1000:
                break
        for row in rows:
            row["confirmed_at"] = datetime.fromisoformat(row["confirmed_at"])
            row["kg_diverted"] = float(row["kg_diverted"])
        return rows

    # ---------- badges ----------

    def earned_badges(self, user_id: str) -> dict[str, datetime]:
        """{badge id: when it was earned}"""
        rows = self.client.table("badges").select("badge_id, earned_at").eq("user_id", user_id).execute().data
        return {r["badge_id"]: datetime.fromisoformat(r["earned_at"]) for r in rows}

    def add_badges(self, user_id: str, badge_ids: list[str]) -> None:
        """Badges the player already has are left alone (and keep their date)."""
        if not badge_ids:
            return
        rows = [{"user_id": user_id, "badge_id": b} for b in badge_ids]
        self.client.table("badges").upsert(rows, on_conflict="user_id,badge_id", ignore_duplicates=True).execute()

    # ---------- profiles ----------

    def get_profile(self, user_id: str) -> dict | None:
        rows = self.client.table("profiles").select("*").eq("id", user_id).limit(1).execute().data
        if not rows:
            return None
        profile = rows[0]
        if profile.get("blue_week_of"):
            profile["blue_week_of"] = date.fromisoformat(profile["blue_week_of"])
        return profile

    def update_profile(self, user_id: str, changes: dict) -> dict:
        # Supabase sends JSON, so dates go as "2026-10-26"
        changes = {k: v.isoformat() if isinstance(v, date) else v for k, v in changes.items()}
        self.client.table("profiles").update(changes).eq("id", user_id).execute()
        return self.get_profile(user_id)

    # ---------- leaderboard ----------

    def leaderboard(self, period: str, limit: int) -> list[dict]:
        """Top players from the leaderboard view. Each row: user_id, name, avatar, points, rank."""
        res = (
            self.client.table(LEADERBOARD_VIEWS[period])
            .select("*")
            .order("rank")
            .order("user_id")  # same order every time when players tie
            .limit(limit)
            .execute()
        )
        return res.data

    def leaderboard_entry(self, period: str, user_id: str) -> dict | None:
        """One player's row, with their rank among everyone. None if they have no points yet."""
        rows = (
            self.client.table(LEADERBOARD_VIEWS[period])
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
            .data
        )
        return rows[0] if rows else None

    # ---------- points ----------

    def award_points(
        self, scan_id: str, user_id: str, points: int, kg: float, daily_cap: int
    ) -> dict:
        """Calls award_points in 001_init.sql. Returns {"awarded", "total_points"}."""
        data = self.client.rpc(
            "award_points",
            {
                "p_scan_id": scan_id,
                "p_user_id": user_id,
                "p_points": points,
                "p_kg": kg,
                "p_daily_cap": daily_cap,
            },
        ).execute().data
        if not isinstance(data, dict) or "error" in data:
            raise ScanNotPending(str(data))
        return data


@lru_cache
def _connect(url: str, key: str) -> Database:
    options = ClientOptions(auto_refresh_token=False, persist_session=False)
    return Database(create_client(url, key, options=options))


def get_db() -> Database:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise HTTPException(
            503, "Supabase isn't set up. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env."
        )
    return _connect(settings.supabase_url, settings.supabase_service_key)
