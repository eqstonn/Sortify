"""Confirm, correct and history, with Gemini and Supabase both faked."""

import json
import uuid

import pytest

from app.config import load_settings
from app.main import create_app
from app.services import gemini
from tests.conftest import make_photo


@pytest.fixture
def gemini_says(monkeypatch):
    def set_reply(category_id, item="thing", confidence=0.9):
        reply = json.dumps({"category_id": category_id, "item": item, "confidence": confidence})
        monkeypatch.setattr(gemini, "ask_gemini", lambda image: reply)

    return set_reply


@pytest.fixture
def scan(client, gemini_says):
    """scan("aluminum_can", headers, seed=1) -> scan id. Each seed is a different photo."""

    def do_scan(category_id, headers, seed=1, **form):
        gemini_says(category_id)
        photo = make_photo(seed=seed)
        res = client.post(
            "/classify", files={"image": ("scan.jpg", photo, "image/jpeg")}, data=form, headers=headers
        )
        assert res.status_code == 200, res.text
        return res.json()["scan_id"]

    return do_scan


def confirm(client, scan_id, headers):
    return client.post(f"/scans/{scan_id}/confirm", headers=headers)


# ---------- auth ----------


@pytest.mark.parametrize(
    "method, path",
    [
        ("post", f"/scans/{uuid.uuid4()}/confirm"),
        ("post", f"/scans/{uuid.uuid4()}/correct"),
        ("get", "/scans/me"),
        ("post", "/classify"),
    ],
)
def test_signed_out_gets_401(client, method, path):
    assert getattr(client, method)(path).status_code == 401


def test_bad_token_gets_401(client):
    assert client.get("/scans/me", headers={"Authorization": "Bearer made-up"}).status_code == 401


def test_without_supabase_settings_gives_503(monkeypatch):
    from fastapi.testclient import TestClient

    import app.db

    monkeypatch.setattr(app.db, "get_settings", lambda: load_settings(_env_file=None))
    res = TestClient(create_app()).get("/scans/me", headers={"Authorization": "Bearer x"})
    assert res.status_code == 503


# ---------- confirm ----------


def test_scan_is_saved_as_pending(client, db, auth, scan):
    scan_id = scan("aluminum_can", auth)
    saved = db.scans[scan_id]
    assert saved["user_id"] == "alice"
    assert saved["status"] == "pending"
    assert saved["image_hash"]
    assert db.profiles["alice"]["total_points"] == 0  # no points until confirm


def test_confirm_awards_points_with_first_time_bonus(client, db, auth, scan):
    scan_id = scan("aluminum_can", auth)
    res = confirm(client, scan_id, auth)
    assert res.status_code == 200
    body = res.json()
    assert body["points_awarded"] == 10 + 15
    assert body["total_points"] == 25
    assert "bonus" in body["notes"][0]
    assert db.profiles["alice"]["items_sorted"] == 1
    assert db.profiles["alice"]["kg_diverted"] > 0


def test_second_of_same_kind_has_no_bonus(client, auth, scan):
    confirm(client, scan("aluminum_can", auth, seed=1), auth)
    body = confirm(client, scan("aluminum_can", auth, seed=2), auth).json()
    assert body["points_awarded"] == 10
    assert body["total_points"] == 35


def test_cant_confirm_twice(client, db, auth, scan):
    scan_id = scan("aluminum_can", auth)
    confirm(client, scan_id, auth)
    assert confirm(client, scan_id, auth).status_code == 409
    assert db.profiles["alice"]["total_points"] == 25


def test_same_photo_twice_gets_no_points(client, auth, scan):
    confirm(client, scan("aluminum_can", auth, seed=7), auth)
    body = confirm(client, scan("aluminum_can", auth, seed=7), auth).json()
    assert body["points_awarded"] == 0
    assert "already used" in body["notes"][0]


def test_someone_elses_photo_gets_no_points(client, db, auth, scan):
    bob = db.add_user("bob", token="bob-token")
    confirm(client, scan("battery", auth, seed=7), auth)
    assert confirm(client, scan("battery", bob, seed=7), bob).json()["points_awarded"] == 0


def test_daily_cap(client, db, auth, scan, monkeypatch):
    monkeypatch.setenv("DAILY_POINT_CAP", "60")
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        first = confirm(client, scan("battery", auth, seed=1), auth).json()  # 40 + 15 bonus
        second = confirm(client, scan("battery", auth, seed=2), auth).json()  # 40, but only 5 left
        third = confirm(client, scan("battery", auth, seed=3), auth).json()
    finally:
        get_settings.cache_clear()
    assert first["points_awarded"] == 55
    assert second["points_awarded"] == 5
    assert "limit" in second["notes"][0]
    assert third["points_awarded"] == 0
    assert db.profiles["alice"]["total_points"] == 60


def test_yesterdays_points_dont_count_toward_cap(client, db, auth, scan, monkeypatch):
    monkeypatch.setenv("DAILY_POINT_CAP", "60")
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        old = scan("battery", auth, seed=1)
        confirm(client, old, auth)
        db.backdate_confirmed(old, days=1)
        body = confirm(client, scan("battery", auth, seed=2), auth).json()
    finally:
        get_settings.cache_clear()
    assert body["points_awarded"] == 40


def test_cant_confirm_someone_elses_scan(client, db, auth, scan):
    bob = db.add_user("bob", token="bob-token")
    scan_id = scan("aluminum_can", auth)
    assert confirm(client, scan_id, bob).status_code == 404
    assert db.scans[scan_id]["status"] == "pending"


def test_unknown_scan_must_be_corrected_first(client, auth, scan):
    scan_id = scan("not_a_real_category", auth)
    res = confirm(client, scan_id, auth)
    assert res.status_code == 400


def test_missing_scan_is_404(client, auth):
    assert confirm(client, uuid.uuid4(), auth).status_code == 404


def test_bad_scan_id_is_422(client, auth):
    assert confirm(client, "not-a-uuid", auth).status_code == 422


# ---------- correct ----------


def test_correct_changes_bin_and_caps_points(client, db, auth, scan):
    scan_id = scan("chip_bag", auth)
    res = client.post(f"/scans/{scan_id}/correct", json={"category_id": "battery"}, headers=auth)
    assert res.status_code == 200
    body = res.json()
    assert body["bin"] == "dropoff"
    assert body["points"] == 10  # not the 40 a battery would normally get
    assert body["scan_id"] == scan_id

    body = confirm(client, scan_id, auth).json()
    assert body["category_id"] == "battery"
    assert body["points_awarded"] == 10
    assert body["notes"] == []


def test_correct_unknown_scan_then_confirm(client, auth, scan):
    scan_id = scan("unknown", auth)
    client.post(f"/scans/{scan_id}/correct", json={"category_id": "paper"}, headers=auth)
    assert confirm(client, scan_id, auth).json()["points_awarded"] == 8


def test_correct_with_location_finds_dropoff(client, auth, scan):
    scan_id = scan("chip_bag", auth)
    body = client.post(
        f"/scans/{scan_id}/correct",
        json={"category_id": "battery", "lat": 45.42, "lon": -75.69},
        headers=auth,
    ).json()
    assert body["nearest_dropoff"]["site"]["address"]


def test_correct_to_made_up_category_is_422(client, auth, scan):
    scan_id = scan("chip_bag", auth)
    res = client.post(f"/scans/{scan_id}/correct", json={"category_id": "gold_bar"}, headers=auth)
    assert res.status_code == 422


def test_cant_correct_after_confirm(client, auth, scan):
    scan_id = scan("chip_bag", auth)
    confirm(client, scan_id, auth)
    res = client.post(f"/scans/{scan_id}/correct", json={"category_id": "battery"}, headers=auth)
    assert res.status_code == 409


def test_cant_correct_someone_elses_scan(client, db, auth, scan):
    bob = db.add_user("bob", token="bob-token")
    scan_id = scan("chip_bag", auth)
    res = client.post(f"/scans/{scan_id}/correct", json={"category_id": "paper"}, headers=bob)
    assert res.status_code == 404


# ---------- history ----------


def test_my_scans_newest_first_and_only_mine(client, db, auth, scan):
    bob = db.add_user("bob", token="bob-token")
    first = scan("aluminum_can", auth, seed=1)
    second = scan("paper", auth, seed=2)
    scan("battery", bob, seed=3)
    confirm(client, first, auth)

    rows = client.get("/scans/me", headers=auth).json()
    assert [r["id"] for r in rows] == [second, first]
    assert rows[0]["status"] == "pending"
    assert rows[1]["status"] == "confirmed"
    assert rows[1]["points_awarded"] == 25
    assert rows[1]["bin"] == "blue_bin"
