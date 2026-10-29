"""scripts/seed.py with Supabase faked. "Now" is pinned to Thursday Oct 29, 2026."""

from collections import defaultdict
from datetime import datetime, timedelta

import pytest

from app.services import badges, clock, points
from scripts import seed

CAP = 200
NOW = datetime(2026, 10, 29, 14, 30, tzinfo=clock.OTTAWA)  # a Thursday afternoon


@pytest.fixture(autouse=True)
def pinned_today(monkeypatch):
    monkeypatch.setattr(clock, "today", lambda: NOW.date())


@pytest.fixture
def seeded(db):
    seed.seed(db, NOW, CAP)
    return db


def fake_ids(db):
    return [db.find_user(seed.EMAIL.format(n)) for n in range(1, len(seed.PLAYERS) + 1)]


def test_makes_20_named_players(seeded):
    ids = fake_ids(seeded)
    assert len(ids) == 20 and None not in ids
    assert sorted(seeded.profiles[i]["name"] for i in ids) == sorted(p.name for p in seed.PLAYERS)


def test_running_twice_makes_no_duplicates(seeded):
    before = (len(seeded.profiles), len(seeded.scans), len(seeded.badges))
    seed.seed(seeded, NOW, CAP)
    assert (len(seeded.profiles), len(seeded.scans), len(seeded.badges)) == before


def test_running_again_a_day_later_replaces_the_month(seeded):
    seed.seed(seeded, NOW + timedelta(days=1), CAP)
    assert len(seeded.profiles) == 20
    oldest = min(s["confirmed_at"] for s in seeded.scans.values())
    assert oldest.date() >= (NOW + timedelta(days=1)).date() - timedelta(days=seed.DAYS - 1)


def test_points_items_and_kg_match_the_scans(seeded):
    for uid in fake_ids(seeded):
        scans = [s for s in seeded.scans.values() if s["user_id"] == uid]
        profile = seeded.profiles[uid]
        assert profile["total_points"] == sum(s["points_awarded"] for s in scans)
        assert profile["items_sorted"] == len(scans)
        assert profile["kg_diverted"] == pytest.approx(sum(s["kg_diverted"] for s in scans))


def test_scans_follow_the_points_rules(seeded):
    for uid in fake_ids(seeded):
        scans = sorted((s for s in seeded.scans.values() if s["user_id"] == uid), key=lambda s: s["confirmed_at"])
        seen, per_day = set(), defaultdict(int)
        for s in scans:
            # first-time bonus only on the first of each category, then the daily cap
            first = s["category_id"] not in seen
            seen.add(s["category_id"])
            day = s["confirmed_at"].astimezone(clock.OTTAWA).date()
            wanted = points.points_for(s["category_id"], corrected=False, first_time=first)
            assert s["points_awarded"] == points.apply_daily_cap(wanted, per_day[day], CAP)
            per_day[day] += s["points_awarded"]
        assert all(total <= CAP for total in per_day.values())


def test_a_month_up_to_now_and_never_in_the_future(seeded):
    times = [s["confirmed_at"] for s in seeded.scans.values()]
    assert max(times) <= NOW
    assert min(times).date() >= NOW.date() - timedelta(days=seed.DAYS - 1)
    assert all(s["status"] == "confirmed" for s in seeded.scans.values())


def test_the_board_has_a_spread_and_this_week_has_players(seeded):
    week = seeded.leaderboard("week", 20)
    all_time = seeded.leaderboard("all", 20)
    assert len(all_time) == 20
    assert len(week) >= 10
    assert all_time[0]["points"] > 3 * all_time[-1]["points"]


def test_some_players_found_rare_drop_off_items(seeded):
    rare = {"battery", "electronics", "light_bulb", "paint_chemical"}
    assert any(s["category_id"] in rare for s in seeded.scans.values())


def test_badges_match_the_rules(seeded):
    for uid in fake_ids(seeded):
        expected = badges.earned_ids(seeded.confirmed_scans(uid))
        assert set(seeded.earned_badges(uid)) == expected
    assert any(seeded.earned_badges(uid) for uid in fake_ids(seeded))


def test_real_players_are_left_alone(db):
    db.add_user("alice", "alice-token", name="Alice")
    db.add_confirmed_scan("alice", "battery", points_awarded=40)
    seed.seed(db, NOW, CAP)
    seed.seed(db, NOW, CAP)
    seed.remove(db)
    assert db.profiles["alice"]["total_points"] == 40
    assert len(db.scans) == 1


def test_remove_deletes_every_fake_player(seeded):
    assert seed.remove(seeded) == 20
    assert fake_ids(seeded) == [None] * 20
    assert seeded.scans == {} and seeded.profiles == {}
    assert seed.remove(seeded) == 0  # and running it again is fine
