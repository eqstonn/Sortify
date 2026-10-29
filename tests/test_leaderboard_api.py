"""GET /leaderboard with Supabase faked."""

from datetime import datetime, timedelta, timezone


def board(client, headers, period="week"):
    res = client.get(f"/leaderboard?range={period}", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def test_signed_out_gets_401(client):
    assert client.get("/leaderboard").status_code == 401


def test_bad_range_is_422(client, auth):
    assert client.get("/leaderboard?range=year", headers=auth).status_code == 422


def test_sorted_by_points(client, db, auth):
    db.add_user("bob", "bob-token", name="Bob")
    db.add_user("cara", "cara-token", name="Cara")
    db.add_confirmed_scan("bob", "battery", points_awarded=40)
    db.add_confirmed_scan("cara", "paper", points_awarded=8)
    db.add_confirmed_scan("alice", "aluminum_can", points_awarded=25)

    body = board(client, auth, "all")
    assert [e["name"] for e in body["entries"]] == ["Bob", "Recycler", "Cara"]
    assert [e["rank"] for e in body["entries"]] == [1, 2, 3]
    assert body["me"]["rank"] == 2
    assert body["me"]["is_me"] is True
    assert [e["is_me"] for e in body["entries"]] == [False, True, False]


def test_top_20_and_my_rank_when_35th(client, db, auth):
    for i in range(40):
        db.add_user(f"p{i:02}", f"t{i}")
        db.add_confirmed_scan(f"p{i:02}", "paper", points_awarded=1000 - i * 10)
    # alice lands between p33 (670) and p34 (660)
    db.add_confirmed_scan("alice", "paper", points_awarded=665)

    body = board(client, auth, "all")
    assert len(body["entries"]) == 20
    assert body["entries"][0]["points"] == 1000
    assert not any(e["is_me"] for e in body["entries"])
    assert body["me"]["rank"] == 35
    assert body["me"]["points"] == 665


def test_ties_share_a_rank(client, db, auth):
    db.add_user("bob", "bob-token")
    db.add_user("cara", "cara-token")
    db.add_confirmed_scan("alice", "paper", points_awarded=50)
    db.add_confirmed_scan("bob", "paper", points_awarded=50)
    db.add_confirmed_scan("cara", "paper", points_awarded=10)
    assert [e["rank"] for e in board(client, auth, "all")["entries"]] == [1, 1, 3]


def test_no_points_means_no_row(client, db, auth):
    db.add_user("bob", "bob-token")
    db.add_confirmed_scan("bob", "paper", points_awarded=8)
    body = board(client, auth)
    assert body["me"] is None
    assert [e["user_id"] for e in body["entries"]] == ["bob"]


def test_week_ignores_points_from_before_this_week(client, db, auth):
    db.add_user("bob", "bob-token", name="Bob")
    long_ago = datetime.now(timezone.utc) - timedelta(days=8)
    db.add_confirmed_scan("bob", "battery", points_awarded=500, when=long_ago)
    db.add_confirmed_scan("bob", "paper", points_awarded=8)
    db.add_confirmed_scan("alice", "aluminum_can", points_awarded=25)

    week = board(client, auth, "week")
    assert [(e["name"], e["points"]) for e in week["entries"]] == [("Recycler", 25), ("Bob", 8)]

    all_time = board(client, auth, "all")
    assert [(e["name"], e["points"]) for e in all_time["entries"]] == [("Bob", 508), ("Recycler", 25)]


def test_week_is_the_default(client, auth):
    assert board(client, auth, "week")["range"] == "week"
    assert client.get("/leaderboard", headers=auth).json()["range"] == "week"


def test_rows_count_items_sorted_in_the_range(client, db, auth):
    db.add_confirmed_scan("alice", "paper", points_awarded=8)
    db.add_confirmed_scan("alice", "aluminum_can", points_awarded=10)
    db.add_confirmed_scan("alice", "paper", points_awarded=8, when=datetime.now(timezone.utc) - timedelta(days=30))

    assert board(client, auth, "week")["me"]["items"] == 2
    assert board(client, auth, "all")["me"]["items"] == 3


def test_items_is_optional_before_migration_004(client, db, auth):
    # Without 004_leaderboard_items.sql the views have no items column
    db.add_confirmed_scan("alice", "paper", points_awarded=8)
    rows = db._leaderboard_rows("all")
    db.leaderboard = lambda period, limit: [{k: v for k, v in r.items() if k != "items"} for r in rows]

    body = board(client, auth, "all")
    assert body["entries"][0]["items"] is None
