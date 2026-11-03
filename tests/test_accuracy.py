"""Accuracy diagnostics including the bias/denominator edge cases."""

from app.services.accuracy import accuracy_report


def row(predicted, final=None, confidence=0.91):
    return {"category_id": predicted, "final_category_id": final, "confidence": confidence}


def test_empty_report_has_no_false_100_percent_accuracy():
    result = accuracy_report([])
    assert result["overall"]["observed_uncorrected_pct"] is None
    assert result["overall"]["reviewed_accuracy_pct"] is None
    assert result["confidence_buckets"][0]["confirmed_scans"] == 0


def test_report_distinguishes_no_feedback_from_reviewed_correct():
    scans = [
        row("aluminum_can"),  # unreviewed: NOT known correct
        row("aluminum_can", "aluminum_can", 0.4),  # explicitly reviewed, matches
        row("aluminum_can", "battery", 0.6),  # explicitly corrected
        row("battery", "aluminum_can", 0.9),
    ]
    report = accuracy_report(scans)
    assert report["overall"] == {
        "confirmed_scans": 4, "corrections": 2,
        "observed_uncorrected_pct": 50.0, "reviewed_scans": 3,
        "reviewed_accuracy_pct": 33.3,
    }
    assert report["per_category"][0]["category_id"] == "aluminum_can"
    assert report["per_category"][0]["corrections"] == 1
    assert report["per_reported_actual_category"][0] == {
        "category_id": "aluminum_can", "reviewed_scans": 2,
        "correctly_predicted": 1, "reviewed_accuracy_pct": 50.0,
    }
    assert report["common_mixups"] == [
        {"predicted_category_id": "aluminum_can", "actual_category_id": "battery", "count": 1},
        {"predicted_category_id": "battery", "actual_category_id": "aluminum_can", "count": 1},
    ]
    assert [s["confirmed_scans"] for s in report["confidence_buckets"]] == [1, 1, 0, 2]


def test_repeated_mixups_are_sorted_and_incomplete_feedback_excluded():
    r = accuracy_report([row("paper", "battery", .63)] * 4 + [row("paper", "glass_bottle")] + [row("paper")] * 3)
    assert r["common_mixups"][0]["count"] == 4
    assert r["overall"]["corrections"] == 5
    assert r["overall"]["reviewed_scans"] == 5


def test_stats_endpoint_requires_auth_and_ignores_pending(client, db, auth):
    assert client.get("/stats/accuracy").status_code == 401
    pending = db.insert_scan({"user_id": "alice", "category_id": "paper", "item": "flyer", "confidence": .9})
    confirmed = db.add_confirmed_scan("alice", "aluminum_can")
    db.scans[confirmed].update({"final_category_id": "battery", "confidence": .61})
    resp = client.get("/stats/accuracy", headers=auth)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["overall"]["confirmed_scans"] == 1
    assert data["overall"]["corrections"] == 1
    assert data["common_mixups"][0]["actual_category_id"] == "battery"
    assert "user_id" not in resp.text
