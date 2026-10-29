"""scripts/smoke_test.py run against the app in-process, with Gemini and Supabase faked."""

import json

import httpx

from app.services import gemini
from scripts import smoke_test


def fake_gemini(monkeypatch, **reply):
    monkeypatch.setattr(gemini, "ask_gemini", lambda image: json.dumps(reply))


def test_passes_against_a_working_backend(client, db, monkeypatch, capsys):
    db.add_user("smoke", "smoke-token")
    fake_gemini(monkeypatch, category_id="aluminum_can", item="Coke can", confidence=0.93)

    assert smoke_test.run(client, lambda: "smoke-token", smoke_test.test_photo()) is True

    out = capsys.readouterr().out
    assert "PASS  GET /health" in out
    assert "PASS  POST /classify   'Coke can' -> aluminum_can (blue_bin, 93% sure)" in out


def test_unknown_still_passes(client, db, monkeypatch):
    db.add_user("smoke", "smoke-token")
    fake_gemini(monkeypatch, category_id="aluminum_can", item="Grey shape", confidence=0.2)  # too unsure

    assert smoke_test.run(client, lambda: "smoke-token", smoke_test.test_photo()) is True


def test_fails_on_a_bad_login(client, monkeypatch, capsys):
    fake_gemini(monkeypatch, category_id="aluminum_can", item="Coke can", confidence=0.93)

    assert smoke_test.run(client, lambda: "not-a-real-token", smoke_test.test_photo()) is False
    assert "FAIL  POST /classify   HTTP 401" in capsys.readouterr().out


def test_a_dead_server_fails_health_and_skips_classify(capsys):
    def refuse(request):
        raise httpx.ConnectError("connection refused")

    asked_for_token = []
    with httpx.Client(base_url="http://dead", transport=httpx.MockTransport(refuse)) as client:
        assert smoke_test.run(client, lambda: asked_for_token.append(1), b"") is False

    out = capsys.readouterr().out
    assert "FAIL  GET /health" in out and "SKIP  POST /classify" in out
    assert asked_for_token == []  # no test player made for nothing
