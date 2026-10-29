"""Sortify Wrapped: GET /wrapped/{year}/{month} and app/services/wrapped.py, Supabase faked.

All the fake scans are at fixed dates in Sept-Nov 2026, so nothing here
depends on when the tests run.
"""

from datetime import date, datetime, time, timezone

import pytest

from app.services import clock, wrapped


def at(day: date, hour=12) -> datetime:
    """A moment on that Ottawa day."""
    return datetime.combine(day, time(hour), clock.OTTAWA)


def oct(day: int, hour=12) -> datetime:
    return at(date(2026, 10, day), hour)


def get_wrapped(client, headers, year=2026, month=10):
    res = client.get(f"/wrapped/{year}/{month}", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


@pytest.fixture
def october(db, auth):
    """A fixed month for alice, plus bob (top recycler) and cara (one paper)."""
    add = db.add_confirmed_scan
    # Four Sundays (Oct 4, 11, 18, 25) make Sunday the busiest day
    add("alice", "plastic_bottle", 10, oct(4), kg=0.025, item="water bottle")
    add("alice", "plastic_bottle", 10, oct(11), kg=0.025, item="water bottle")
    add("alice", "plastic_bottle", 10, oct(18), kg=0.025, item="water bottle")
    add("alice", "plastic_container", 10, oct(5), kg=0.03, item="takeout container")
    add("alice", "aluminum_can", 10, oct(6), kg=0.015)
    add("alice", "steel_food_can", 10, oct(7), kg=0.06)
    add("alice", "paper", 8, oct(8), kg=0.01)
    add("alice", "cardboard", 10, oct(9), kg=0.2)
    add("alice", "glass_bottle_jar", 12, oct(13), kg=0.3)
    add("alice", "electronics", 30, oct(16), kg=0.5, item="old phone charger")
    add("alice", "battery", 40, oct(22), kg=0.05, item="old laptop battery")
    add("alice", "food_scraps", 8, oct(25), kg=0.3)
    # Outside October: not counted
    add("alice", "paper", 8, at(date(2026, 9, 15)), kg=1.0)
    add("alice", "paper", 8, at(date(2026, 11, 2)), kg=1.0)

    db.add_user("bob", token="bob-token", name="Maya R.")
    add("bob", "battery", 40, oct(3))
    add("bob", "battery", 40, oct(4))
    add("bob", "electronics", 100, oct(5))
    db.add_user("cara", token="cara-token", name="Cara")
    add("cara", "paper", 8, oct(10))


# ---------- the whole month ----------


def test_totals(client, auth, october):
    body = get_wrapped(client, auth)
    assert body["year"] == 2026 and body["month"] == 10
    assert body["items"] == 12
    assert body["points"] == 168
    assert body["kg"] == 1.54
    assert body["players"] == 3


def test_top_5_materials_in_order(client, auth, october):
    top = get_wrapped(client, auth)["top_materials"]
    # plastic 4; metal and paper tie at 2 (alphabetical); then the 1-item materials,
    # alphabetical, cut off at 5 (hazardous and organic don't make it)
    assert [(m["material"], m["count"]) for m in top] == [
        ("plastic", 4), ("metal", 2), ("paper", 2), ("electronics", 1), ("glass", 1),
    ]
    assert top[0]["top_items"] == ["Plastic bottle", "Plastic tub or container"]


def test_rarest_find(client, auth, october):
    rarest = get_wrapped(client, auth)["rarest_find"]
    # battery and electronics are both rare; the battery is worth more points
    assert rarest["category_id"] == "battery"
    assert rarest["item"] == "old laptop battery"
    assert rarest["bin"] == "dropoff"
    assert rarest["percent_of_players"] == 67  # alice and bob, out of 3 players


def test_rank_and_top_recycler(client, auth, october):
    body = get_wrapped(client, auth)
    assert body["rank"] == 2
    assert body["top_recycler"] == {
        "user_id": "bob", "name": "Maya R.", "avatar": "sprout", "points": 180, "is_me": False,
    }


def test_busiest_day(client, auth, october):
    assert get_wrapped(client, auth)["busiest_day"] == "sunday"


def test_average_kg(client, auth, october):
    # alice 1.54 + bob 0.3 + cara 0.1 = 1.94 kg over 3 players
    assert get_wrapped(client, auth)["average_kg"] == 0.65


# ---------- empty months ----------


def test_empty_month_returns_zeros(client, auth):
    assert get_wrapped(client, auth, 2026, 3) == {
        "year": 2026,
        "month": 3,
        "items": 0,
        "kg": 0.0,
        "average_kg": 0.0,
        "points": 0,
        "top_materials": [],
        "rarest_find": None,
        "rank": None,
        "players": 0,
        "top_recycler": None,
        "busiest_day": None,
        "longest_streak": 0,
    }


def test_empty_month_for_me_but_not_others(client, db, auth, october):
    me = get_wrapped(client, auth, 2026, 10)
    cara = get_wrapped(client, {"Authorization": "Bearer cara-token"}, 2026, 10)
    assert cara["items"] == 1 and cara["rank"] == 3
    # A month only bob played in
    db.add_confirmed_scan("bob", "paper", 8, at(date(2026, 8, 3)))
    body = get_wrapped(client, auth, 2026, 8)
    assert body["items"] == 0 and body["rank"] is None and body["rarest_find"] is None
    assert body["top_recycler"]["user_id"] == "bob"
    assert me["items"] == 12  # unchanged by the other months


# ---------- month boundaries are Ottawa time ----------


def test_late_night_on_the_31st_counts_in_that_month(client, db, auth):
    # 11:30pm Oct 31 in Ottawa is already Nov 1 in UTC
    late = oct(31, hour=23).replace(minute=30)
    assert late.astimezone(timezone.utc).day == 1
    db.add_confirmed_scan("alice", "paper", 8, late)
    db.add_confirmed_scan("alice", "paper", 8, at(date(2026, 11, 1), hour=0))

    assert get_wrapped(client, auth, 2026, 10)["items"] == 1
    assert get_wrapped(client, auth, 2026, 11)["items"] == 1


def test_december_runs_into_january(client, db, auth):
    db.add_confirmed_scan("alice", "paper", 8, at(date(2026, 12, 31), hour=22))
    db.add_confirmed_scan("alice", "paper", 8, at(date(2027, 1, 1), hour=1))
    assert get_wrapped(client, auth, 2026, 12)["items"] == 1
    assert get_wrapped(client, auth, 2027, 1)["items"] == 1


# ---------- streaks ----------


def test_longest_streak_in_month(client, db, auth):
    for day in [3, 4, 5, 10, 11, 12, 13, 20]:
        db.add_confirmed_scan("alice", "paper", 8, oct(day))
    assert get_wrapped(client, auth)["longest_streak"] == 4


def test_streak_across_month_boundary_counts_in_full(client, db, auth):
    # Sep 28 -> Oct 2 is one 5-day streak; it shows in both months' Wrapped
    for d in [date(2026, 9, 28), date(2026, 9, 29), date(2026, 9, 30), date(2026, 10, 1), date(2026, 10, 2)]:
        db.add_confirmed_scan("alice", "paper", 8, at(d))
    for day in [20, 21, 22]:  # a shorter streak later in October
        db.add_confirmed_scan("alice", "paper", 8, oct(day))

    assert get_wrapped(client, auth, 2026, 10)["longest_streak"] == 5
    assert get_wrapped(client, auth, 2026, 9)["longest_streak"] == 5
    assert get_wrapped(client, auth, 2026, 11)["longest_streak"] == 0


def test_longest_streak_ignores_runs_outside_the_month():
    days = {date(2026, 9, d) for d in range(1, 11)} | {date(2026, 10, 5)}
    assert wrapped.longest_streak(days, date(2026, 10, 1), date(2026, 10, 31)) == 1


# ---------- service details ----------


def scan_row(user_id, category_id, points=10, when=None):
    return {
        "user_id": user_id, "category_id": category_id, "final_category_id": None, "item": "",
        "points_awarded": points, "kg_diverted": 0.0, "confirmed_at": when or oct(1),
    }


def test_ranking_ties_share_a_rank():
    scans = [scan_row("a", "paper", 50), scan_row("b", "paper", 50), scan_row("c", "paper", 20), scan_row("d", "chip_bag", 0)]
    assert [(r["user_id"], r["rank"]) for r in wrapped.ranking(scans)] == [("a", 1), ("b", 1), ("c", 3)]


def test_corrected_scans_count_as_the_corrected_category():
    row = scan_row("a", "chip_bag") | {"final_category_id": "glass_bottle_jar"}
    assert [m.material for m in wrapped.top_materials([row])] == ["glass"]


def test_busiest_day_tie_goes_to_earlier_weekday():
    # Oct 5 is a Monday, Oct 7 a Wednesday
    assert wrapped.busiest_day([scan_row("a", "paper", when=oct(7)), scan_row("a", "paper", when=oct(5))]) == "monday"


def test_rarest_find_tie_goes_to_earliest():
    first = scan_row("a", "battery", when=oct(2)) | {"item": "AA battery"}
    later = scan_row("a", "battery", when=oct(9)) | {"item": "phone battery"}
    assert wrapped.rarest_find([later, first], [later, first]).item == "AA battery"


def test_month_bounds():
    start, end = clock.month_bounds(2026, 12)
    assert (start.year, start.month, end.year, end.month) == (2026, 12, 2027, 1)
    assert start.tzinfo is clock.OTTAWA and start.hour == 0


# ---------- the request itself ----------


def test_signed_out_gets_401(client):
    assert client.get("/wrapped/2026/10").status_code == 401


@pytest.mark.parametrize("path", ["/wrapped/2026/13", "/wrapped/2026/0", "/wrapped/1999/5", "/wrapped/2026/oct"])
def test_bad_month_gets_422(client, auth, path):
    assert client.get(path, headers=auth).status_code == 422
