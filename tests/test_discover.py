"""Discover weekly: data/discover_weekly.json, GET /discover/current and the bonus on confirm."""

import json
from datetime import date, datetime, timedelta, timezone

import pytest

from app.schemas import DiscoverItem
from app.services import clock, discover, rules
from app.services.rules import DATA_DIR

PIZZA = DiscoverItem(category_id="greasy_pizza_box", item="Greasy pizza box", bonus_points=20, explainer="Green bin!")
BATTERY = DiscoverItem(category_id="battery", item="Used battery", bonus_points=25, explainer="Drop-off!")


@pytest.fixture
def this_week_is_pizza(monkeypatch):
    """Pizza box this week (real Ottawa time, like the fake database's confirms), battery next week."""
    monkeypatch.setattr(discover, "load", lambda: (clock.week_start(clock.today()), [PIZZA, BATTERY]))


def pending_scan(db, category_id, user_id="alice"):
    return db.insert_scan({"user_id": user_id, "category_id": category_id, "item": category_id, "confidence": 0.9})["id"]


def confirm(client, db, auth, category_id, user_id="alice"):
    res = client.post(f"/scans/{pending_scan(db, category_id, user_id)}/confirm", headers=auth)
    assert res.status_code == 200, res.text
    return res.json()


# ---------- the data file ----------


def test_data_file_is_valid():
    first_week, items = discover.load()
    assert first_week.weekday() == 0, "first_week must be a Monday"
    assert len(items) >= 4
    for item in items:
        assert item.category_id in rules.load_categories(), item.category_id
    assert len({i.category_id for i in items}) == len(items), "each item once per cycle"


def test_data_file_parses_without_cache():
    raw = json.loads((DATA_DIR / "discover_weekly.json").read_text(encoding="utf-8"))
    assert all(DiscoverItem(**i).bonus_points > 0 for i in raw["items"])


# ---------- which item is this week's ----------


def test_one_item_per_week_in_order():
    first_week, items = discover.load()
    assert discover.current(first_week) == items[0]
    assert discover.current(first_week + timedelta(days=6)) == items[0]  # Sunday, same week
    assert discover.current(first_week + timedelta(days=7)) == items[1]  # next Monday
    assert discover.current(first_week + timedelta(weeks=len(items))) == items[0]  # wraps around
    assert discover.current(first_week - timedelta(days=1)) == items[-1]  # before the list started


def test_week_bounds():
    assert discover.week_bounds(date(2026, 10, 28)) == (date(2026, 10, 26), date(2026, 11, 1))


# ---------- GET /discover/current ----------


def test_current(client, db, auth, this_week_is_pizza):
    body = client.get("/discover/current", headers=auth).json()
    assert body["category_id"] == "greasy_pizza_box"
    assert body["item"] == "Greasy pizza box"
    assert body["bin"] == "green_bin"  # from categories.json
    assert body["bonus_points"] == 20
    assert body["tips"]
    assert body["week_of"] == clock.week_start(clock.today()).isoformat()
    assert body["found"] is False

    confirm(client, db, auth, "greasy_pizza_box")
    assert client.get("/discover/current", headers=auth).json()["found"] is True


def test_current_signed_out_gets_401(client):
    assert client.get("/discover/current").status_code == 401


# ---------- the bonus on confirm ----------


def test_bonus_for_this_weeks_item(client, db, auth, this_week_is_pizza):
    body = confirm(client, db, auth, "greasy_pizza_box")
    assert body["points_awarded"] == 10 + 15 + 20  # base + first-time + Discover
    assert any("Discover" in n for n in body["notes"])


def test_bonus_only_once_a_week(client, db, auth, this_week_is_pizza):
    confirm(client, db, auth, "greasy_pizza_box")
    body = confirm(client, db, auth, "greasy_pizza_box")
    assert body["points_awarded"] == 10
    assert not any("Discover" in n for n in body["notes"])


def test_no_bonus_for_other_weeks_items(client, db, auth, this_week_is_pizza):
    body = confirm(client, db, auth, "battery")  # next week's item
    assert body["points_awarded"] == 40 + 15


def test_last_weeks_find_doesnt_use_up_this_week(client, db, auth, this_week_is_pizza):
    last_week = datetime.now(timezone.utc) - timedelta(days=8)
    db.add_confirmed_scan("alice", "greasy_pizza_box", 10, last_week)
    assert confirm(client, db, auth, "greasy_pizza_box")["points_awarded"] == 10 + 20  # no first-time bonus


def test_no_bonus_for_a_corrected_scan(client, db, auth, this_week_is_pizza):
    scan_id = pending_scan(db, "chip_bag")
    client.post(f"/scans/{scan_id}/correct", json={"category_id": "greasy_pizza_box"}, headers=auth)
    body = client.post(f"/scans/{scan_id}/confirm", headers=auth).json()
    assert body["points_awarded"] == 10  # corrected scans are capped and get no bonus
    # ...and it counts as found, so a real pizza box later this week gets no bonus either
    assert confirm(client, db, auth, "greasy_pizza_box")["points_awarded"] == 10


def test_other_players_find_doesnt_use_up_yours(client, db, auth, this_week_is_pizza):
    bob = db.add_user("bob", token="bob-token")
    confirm(client, db, bob, "greasy_pizza_box", user_id="bob")
    assert confirm(client, db, auth, "greasy_pizza_box")["points_awarded"] == 45
