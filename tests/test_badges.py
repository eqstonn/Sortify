"""Badges: the rules in app/services/badges.py, awarding on confirm, and the list in GET /me."""

from datetime import date, datetime, time, timedelta, timezone

import pytest

from app.services import badges, clock

START = date(2026, 10, 1)


def scans(*category_ids, days=None) -> list[dict]:
    """Confirmed scans, one a day from Oct 1 unless `days` says which days."""
    days = days or [START + timedelta(days=i) for i in range(len(category_ids))]
    return [
        {"category_id": c, "final_category_id": None, "confirmed_at": datetime.combine(d, time(12), clock.OTTAWA)}
        for c, d in zip(category_ids, days)
    ]


# ---------- the rules ----------


def test_no_scans_no_badges():
    assert badges.earned_ids([]) == set()


def test_first_sort():
    assert badges.earned_ids(scans("paper")) == {"first_sort"}


def test_ewaste_hero_needs_three():
    assert "ewaste_hero" not in badges.earned_ids(scans("battery", "electronics"))
    assert "ewaste_hero" in badges.earned_ids(scans("battery", "electronics", "battery"))


def test_glass_master_needs_ten_bottles_or_jars():
    nine = ["glass_bottle_jar"] * 9
    assert "glass_master" not in badges.earned_ids(scans(*nine, "broken_glass_ceramic"))  # not blue-bin glass
    assert "glass_master" in badges.earned_ids(scans(*nine, "glass_bottle_jar"))


def test_corrected_category_counts():
    row = scans("chip_bag")[0] | {"final_category_id": "glass_bottle_jar"}
    assert "glass_master" in badges.earned_ids([row] * 10)


def test_seven_day_streak():
    assert "streak_7" not in badges.earned_ids(scans(*["paper"] * 6))
    assert "streak_7" in badges.earned_ids(scans(*["paper"] * 7))
    # 7 scans but with a gap: two shorter streaks
    gap = [START + timedelta(days=i) for i in [0, 1, 2, 4, 5, 6, 7]]
    assert "streak_7" not in badges.earned_ids(scans(*["paper"] * 7, days=gap))


def test_new_badges_skips_ones_you_have():
    earned = scans("battery", "electronics", "battery")
    assert badges.new_badges(earned, set()) == ["first_sort", "ewaste_hero"]
    assert badges.new_badges(earned, {"first_sort"}) == ["ewaste_hero"]
    assert badges.new_badges(earned, {"first_sort", "ewaste_hero"}) == []


# ---------- on confirm and in GET /me ----------


def confirm(client, db, headers, category_id, user_id="alice"):
    scan_id = db.insert_scan({"user_id": user_id, "category_id": category_id, "item": category_id})["id"]
    res = client.post(f"/scans/{scan_id}/confirm", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def my_badges(client, headers) -> dict:
    return {b["id"]: b for b in client.get("/me", headers=headers).json()["badges"]}


def test_new_player_has_every_badge_locked(client, auth):
    listed = my_badges(client, auth)
    assert list(listed) == [b.id for b in badges.BADGES]
    assert not any(b["earned"] or b["earned_at"] for b in listed.values())


def test_first_sort_awarded_once(client, db, auth):
    first = confirm(client, db, auth, "paper")
    assert first["new_badges"] == ["first_sort"]
    assert "New badge: First sort!" in first["notes"]
    earned_at = my_badges(client, auth)["first_sort"]["earned_at"]
    assert earned_at is not None

    second = confirm(client, db, auth, "paper")
    assert second["new_badges"] == []
    assert not any("badge" in n for n in second["notes"])
    assert my_badges(client, auth)["first_sort"]["earned_at"] == earned_at  # not re-awarded
    assert len(db.earned_badges("alice")) == 1


def test_ewaste_hero_on_third_item(client, db, auth):
    assert confirm(client, db, auth, "battery")["new_badges"] == ["first_sort"]
    assert confirm(client, db, auth, "electronics")["new_badges"] == []
    assert confirm(client, db, auth, "battery")["new_badges"] == ["ewaste_hero"]
    assert confirm(client, db, auth, "battery")["new_badges"] == []


def test_streak_badge_from_earlier_days(client, db, auth):
    now = datetime.now(timezone.utc)
    for n in range(1, 7):  # the six days before today
        db.add_confirmed_scan("alice", "paper", 8, now - timedelta(days=n))
    db.add_badges("alice", ["first_sort"])
    assert confirm(client, db, auth, "paper")["new_badges"] == ["streak_7"]


def test_earned_badges_listed_first(client, db, auth):
    for _ in range(3):
        confirm(client, db, auth, "electronics")
    order = [b["id"] for b in client.get("/me", headers=auth).json()["badges"]]
    assert order == ["first_sort", "ewaste_hero", "streak_7", "glass_master"]
    assert [b["earned"] for b in client.get("/me", headers=auth).json()["badges"]] == [True, True, False, False]


def test_badges_are_per_player(client, db, auth):
    bob = db.add_user("bob", token="bob-token")
    confirm(client, db, bob, "paper", user_id="bob")
    assert not my_badges(client, auth)["first_sort"]["earned"]


@pytest.mark.parametrize("badge", badges.BADGES, ids=lambda b: b.id)
def test_every_badge_has_name_and_description(badge):
    assert badge.name and badge.description
