"""GET/PATCH /me, PUT /me/schedule and GET /schedule/next with Supabase faked.

clock.today() is pinned to Wednesday Oct 21, 2026 so stats and pickups don't
depend on when the tests run.
"""

from datetime import date, datetime, time, timedelta

import pytest

from app.services import clock

TODAY = date(2026, 10, 21)  # a Wednesday; that week starts Monday Oct 19


@pytest.fixture(autouse=True)
def pinned_today(monkeypatch):
    monkeypatch.setattr(clock, "today", lambda: TODAY)


def at(day: date, hour=12) -> datetime:
    """A moment on that Ottawa day."""
    return datetime.combine(day, time(hour), clock.OTTAWA)


def days_ago(n: int) -> datetime:
    return at(TODAY - timedelta(days=n))


def me(client, headers):
    res = client.get("/me", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


@pytest.mark.parametrize(
    "method, path",
    [("get", "/me"), ("patch", "/me"), ("get", "/schedule/next"), ("put", "/me/schedule")],
)
def test_signed_out_gets_401(client, method, path):
    assert getattr(client, method)(path).status_code == 401


# ---------- GET /me ----------


def test_new_player(client, auth):
    body = me(client, auth)
    assert body["name"] == "Recycler"
    assert body["total_points"] == 0
    assert body["level"]["name"] == "Seed"
    assert body["items_sorted"] == 0
    assert body["current_streak"] == 0
    assert body["longest_streak"] == 0
    assert body["rank"] is None
    assert body["breakdown"] == []
    assert body["schedule"] is None


def test_totals_match_scans(client, db, auth):
    db.add_confirmed_scan("alice", "aluminum_can", 25, days_ago(0), kg=0.015)
    db.add_confirmed_scan("alice", "plastic_bottle", 10, days_ago(1), kg=0.025)
    db.add_confirmed_scan("alice", "paper", 8, days_ago(10), kg=0.01)

    body = me(client, auth)
    assert body["total_points"] == 43
    assert body["items_sorted"] == 3
    assert body["kg_diverted"] == 0.05
    assert body["items_this_week"] == 2  # Oct 21 and 20; Oct 11 is an earlier week
    assert body["rank"] == 1


def test_material_breakdown(client, db, auth):
    for category in ["aluminum_can", "steel_food_can", "plastic_bottle", "paper"]:
        db.add_confirmed_scan("alice", category, 10, days_ago(0))

    breakdown = me(client, auth)["breakdown"]
    assert breakdown[0] == {"material": "metal", "count": 2, "percent": 50}
    assert {b["material"]: b["percent"] for b in breakdown[1:]} == {"plastic": 25, "paper": 25}


def test_corrected_scans_count_as_their_new_category(client, db, auth):
    scan_id = db.add_confirmed_scan("alice", "chip_bag", 2, days_ago(0))
    db.scans[scan_id]["final_category_id"] = "battery"
    assert me(client, auth)["breakdown"] == [{"material": "hazardous", "count": 1, "percent": 100}]


def test_pending_scans_dont_count(client, db, auth):
    db.insert_scan({"user_id": "alice", "category_id": "paper", "item": "paper"})
    body = me(client, auth)
    assert body["breakdown"] == []
    assert body["items_this_week"] == 0


def test_level_comes_from_points(client, db, auth):
    db.add_confirmed_scan("alice", "battery", 160, days_ago(0))
    level = me(client, auth)["level"]
    assert level["name"] == "Seedling"
    assert level["next_name"] == "Sapling"
    assert level["points_to_next"] == 140


def test_streaks(client, db, auth):
    # Longest run: 5 days (Oct 5-9). Current run: Oct 19, 20, 21 = 3 days.
    for n in [16, 15, 14, 13, 12, 2, 1, 0]:
        db.add_confirmed_scan("alice", "paper", 8, days_ago(n))
    db.add_confirmed_scan("alice", "paper", 8, days_ago(0))  # two scans in one day count once

    body = me(client, auth)
    assert body["current_streak"] == 3
    assert body["longest_streak"] == 5


def test_streak_survives_until_you_scan_today(client, db, auth):
    db.add_confirmed_scan("alice", "paper", 8, days_ago(2))
    db.add_confirmed_scan("alice", "paper", 8, days_ago(1))
    assert me(client, auth)["current_streak"] == 2


def test_streak_breaks_after_a_missed_day(client, db, auth):
    db.add_confirmed_scan("alice", "paper", 8, days_ago(3))
    db.add_confirmed_scan("alice", "paper", 8, days_ago(2))
    body = me(client, auth)
    assert body["current_streak"] == 0
    assert body["longest_streak"] == 2


def test_late_night_scan_counts_on_the_ottawa_day(client, db, auth):
    # 11:30pm Oct 20 in Ottawa is already Oct 21 in UTC; it still belongs to Oct 20
    db.add_confirmed_scan("alice", "paper", 8, at(TODAY - timedelta(days=1), hour=23))
    assert me(client, auth)["current_streak"] == 1  # yesterday only, not today


# ---------- PATCH /me ----------


def test_change_name_and_avatar(client, db, auth):
    res = client.patch("/me", json={"name": "  Alice  ", "avatar": "fox"}, headers=auth)
    assert res.status_code == 200
    assert res.json()["name"] == "Alice"
    assert res.json()["avatar"] == "fox"
    assert db.profiles["alice"]["name"] == "Alice"


def test_change_only_avatar_keeps_name(client, auth):
    client.patch("/me", json={"name": "Alice"}, headers=auth)
    body = client.patch("/me", json={"avatar": "owl"}, headers=auth).json()
    assert body["name"] == "Alice"
    assert body["avatar"] == "owl"


@pytest.mark.parametrize("name", ["", "   ", "x" * 31])
def test_bad_name_is_422(client, db, auth, name):
    res = client.patch("/me", json={"name": name}, headers=auth)
    assert res.status_code == 422
    assert db.profiles["alice"]["name"] == "Recycler"


def test_unknown_avatar_is_422(client, auth):
    assert client.patch("/me", json={"avatar": "https://evil.example/x.png"}, headers=auth).status_code == 422


# ---------- pickup schedule ----------


def test_no_schedule_yet_is_404(client, auth):
    res = client.get("/schedule/next", headers=auth)
    assert res.status_code == 404
    assert "pickup day" in res.json()["detail"]


def test_set_schedule_then_next_pickup(client, db, auth):
    res = client.put("/me/schedule", json={"pickup_day": "tuesday", "this_week": "blue_bin"}, headers=auth)
    assert res.status_code == 200
    # Today is Wed Oct 21, so this week's Tuesday has passed: next is Tue Oct 27, a black week
    assert res.json()["pickup_date"] == "2026-10-27"
    assert res.json()["bins"] == ["black_bin", "green_bin"]
    assert res.json()["label"] == "Black + green bin · Tue, Oct 27"
    assert db.profiles["alice"]["pickup_day"] == 1
    assert db.profiles["alice"]["blue_week_of"] == date(2026, 10, 19)

    assert client.get("/schedule/next", headers=auth).json() == res.json()
    assert me(client, auth)["schedule"] == {"pickup_day": "tuesday", "blue_week_of": "2026-10-19"}


def test_black_this_week(client, auth):
    body = client.put("/me/schedule", json={"pickup_day": "friday", "this_week": "black_bin"}, headers=auth).json()
    assert body["pickup_date"] == "2026-10-23"
    assert body["bins"] == ["black_bin", "green_bin"]
    assert body["days_away"] == 2


@pytest.mark.parametrize(
    "payload",
    [
        {"pickup_day": "saturday", "this_week": "blue_bin"},
        {"pickup_day": "monday", "this_week": "green_bin"},
        {"pickup_day": "monday"},
    ],
)
def test_bad_schedule_is_422(client, auth, payload):
    assert client.put("/me/schedule", json=payload, headers=auth).status_code == 422
