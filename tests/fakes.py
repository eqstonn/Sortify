"""An in-memory stand-in for app.db.Database, so tests never touch Supabase."""

import uuid
from datetime import datetime, time, timedelta, timezone

from app.db import ScanNotPending
from app.services import clock, points


class FakeDB:
    def __init__(self):
        self.tokens: dict[str, str] = {}  # login token -> user id
        self.profiles: dict[str, dict] = {}
        self.scans: dict[str, dict] = {}
        self.badges: dict[tuple[str, str], datetime] = {}  # (user id, badge id) -> earned at

    def add_user(self, user_id: str, token: str, name: str = "Recycler") -> dict:
        """Like a player signing in anonymously. Returns headers for that player."""
        self.tokens[token] = user_id
        self.profiles[user_id] = {
            "id": user_id,
            "name": name,
            "avatar": "sprout",
            "total_points": 0,
            "items_sorted": 0,
            "kg_diverted": 0.0,
            "pickup_day": None,
            "blue_week_of": None,
        }
        return {"Authorization": f"Bearer {token}"}

    # ---------- same methods as app.db.Database ----------

    def user_id_from_token(self, token):
        return self.tokens.get(token)

    def insert_scan(self, row):
        scan = {
            "id": str(uuid.uuid4()),
            "final_category_id": None,
            "image_hash": None,
            "status": "pending",
            "points_awarded": 0,
            "kg_diverted": 0.0,
            "created_at": datetime.now(timezone.utc),
            "confirmed_at": None,
            **row,
        }
        self.scans[scan["id"]] = scan
        return dict(scan)

    def get_scan(self, scan_id):
        scan = self.scans.get(scan_id)
        return dict(scan) if scan else None

    def set_final_category(self, scan_id, category_id):
        self.scans[scan_id]["final_category_id"] = category_id
        return dict(self.scans[scan_id])

    def list_scans(self, user_id, limit=50):
        mine = [dict(s) for s in self.scans.values() if s["user_id"] == user_id]
        return sorted(mine, key=lambda s: s["created_at"], reverse=True)[:limit]

    def confirmed_categories(self, user_id):
        return {
            s["final_category_id"] or s["category_id"]
            for s in self.scans.values()
            if s["user_id"] == user_id and s["status"] == "confirmed"
        }

    def recent_confirmed_hashes(self):
        return [s["image_hash"] for s in self.scans.values() if s["status"] == "confirmed" and s["image_hash"]]

    def confirmed_scans(self, user_id):
        mine = [dict(s) for s in self.scans.values() if s["user_id"] == user_id and s["status"] == "confirmed"]
        return sorted(mine, key=lambda s: s["confirmed_at"], reverse=True)

    def scans_between(self, start, end):
        rows = [
            dict(s) for s in self.scans.values()
            if s["status"] == "confirmed" and start <= s["confirmed_at"] < end
        ]
        return sorted(rows, key=lambda s: s["confirmed_at"])

    def earned_badges(self, user_id):
        return {badge: at for (uid, badge), at in self.badges.items() if uid == user_id}

    def add_badges(self, user_id, badge_ids):
        for badge in badge_ids:
            self.badges.setdefault((user_id, badge), datetime.now(timezone.utc))

    def get_profile(self, user_id):
        profile = self.profiles.get(user_id)
        return dict(profile) if profile else None

    def update_profile(self, user_id, changes):
        self.profiles[user_id].update(changes)
        return dict(self.profiles[user_id])

    def leaderboard(self, period, limit):
        return self._leaderboard_rows(period)[:limit]

    def leaderboard_entry(self, period, user_id):
        return next((r for r in self._leaderboard_rows(period) if r["user_id"] == user_id), None)

    def award_points(self, scan_id, user_id, points_wanted, kg, daily_cap):
        """Mirrors award_points in supabase/migrations/001_init.sql (UTC days here)."""
        scan = self.scans.get(scan_id)
        if scan is None or scan["user_id"] != user_id or scan["status"] != "pending":
            raise ScanNotPending("not_pending")

        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        earned_today = sum(
            s["points_awarded"]
            for s in self.scans.values()
            if s["user_id"] == user_id and s["status"] == "confirmed" and s["confirmed_at"] >= today_start
        )
        awarded = points.apply_daily_cap(points_wanted, earned_today, daily_cap)

        scan.update(status="confirmed", confirmed_at=now, points_awarded=awarded, kg_diverted=kg)
        profile = self.profiles[user_id]
        profile["total_points"] += awarded
        profile["items_sorted"] += 1
        profile["kg_diverted"] += kg
        return {"awarded": awarded, "total_points": profile["total_points"]}

    # ---------- the leaderboard views in 001_init.sql ----------

    def _leaderboard_rows(self, period):
        if period == "all":
            totals = {uid: p["total_points"] for uid, p in self.profiles.items()}
        else:
            week_start = datetime.combine(clock.week_start(clock.today()), time(), clock.OTTAWA)
            totals = {}
            for s in self.scans.values():
                if s["status"] == "confirmed" and s["confirmed_at"] >= week_start:
                    totals[s["user_id"]] = totals.get(s["user_id"], 0) + s["points_awarded"]

        ordered = sorted(((pts, uid) for uid, pts in totals.items() if pts > 0), key=lambda t: (-t[0], t[1]))
        rows = []
        for pts, uid in ordered:
            # rank(): players with equal points share a rank, and the next rank skips ahead
            rank = rows[-1]["rank"] if rows and rows[-1]["points"] == pts else len(rows) + 1
            profile = self.profiles[uid]
            rows.append({"user_id": uid, "name": profile["name"], "avatar": profile["avatar"], "points": pts, "rank": rank})
        return rows

    # ---------- test helpers ----------

    def backdate_confirmed(self, scan_id, days):
        self.scans[scan_id]["confirmed_at"] -= timedelta(days=days)

    def add_confirmed_scan(self, user_id, category_id, points_awarded=10, when=None, kg=0.1, item=None):
        """A scan that was already confirmed (at `when`, default now), with the profile updated to match."""
        scan = self.insert_scan({"user_id": user_id, "category_id": category_id, "item": item or category_id})
        scan_row = self.scans[scan["id"]]
        scan_row.update(
            status="confirmed",
            confirmed_at=when or datetime.now(timezone.utc),
            points_awarded=points_awarded,
            kg_diverted=kg,
        )
        profile = self.profiles[user_id]
        profile["total_points"] += points_awarded
        profile["items_sorted"] += 1
        profile["kg_diverted"] += kg
        return scan["id"]
