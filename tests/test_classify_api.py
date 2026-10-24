"""POST /classify with Gemini and Supabase faked, so these are free and work offline."""

import json

import pytest

from app.routers import classify as classify_router
from app.services import gemini


@pytest.fixture(autouse=True)
def signed_in(client, auth):
    client.headers.update(auth)


@pytest.fixture
def fake_gemini(monkeypatch):
    """Call fake_gemini(category_id=..., item=..., confidence=...) to set Gemini's reply."""
    seen = {}

    def set_reply(**reply):
        def fake_ask(image: bytes) -> str:
            seen["image"] = image
            return json.dumps(reply)

        monkeypatch.setattr(gemini, "ask_gemini", fake_ask)
        return seen

    return set_reply


def scan(client, photo, **form):
    return client.post("/classify", files={"image": ("scan.jpg", photo, "image/jpeg")}, data=form)


def test_can_goes_in_blue_bin(client, photo, fake_gemini):
    fake_gemini(category_id="aluminum_can", item="Coke can", confidence=0.95)
    res = scan(client, photo)
    assert res.status_code == 200
    body = res.json()
    assert body["category_id"] == "aluminum_can"
    assert body["item"] == "Coke can"
    assert body["bin"] == "blue_bin"
    assert body["recyclable"] is True
    assert body["points"] > 0
    assert body["tips"]
    assert body["nearest_dropoff"] is None


def test_gemini_gets_the_shrunk_photo(client, photo, fake_gemini):
    seen = fake_gemini(category_id="paper", item="Flyer", confidence=0.9)
    scan(client, photo)
    assert seen["image"][:2] == b"\xff\xd8"  # JPEG
    assert len(seen["image"]) < len(photo)


def test_battery_with_location_gets_nearest_dropoff(client, photo, fake_gemini):
    fake_gemini(category_id="battery", item="AA battery", confidence=0.9)
    body = scan(client, photo, lat="45.42", lon="-75.69").json()
    assert body["bin"] == "dropoff"
    assert body["dropoff_type"] == "batteries"
    assert "batteries" in body["nearest_dropoff"]["site"]["accepts"]


def test_battery_without_location_has_no_dropoff(client, photo, fake_gemini):
    fake_gemini(category_id="battery", item="AA battery", confidence=0.9)
    assert scan(client, photo).json()["nearest_dropoff"] is None


def test_unsure_answer_says_not_sure(client, photo, fake_gemini):
    fake_gemini(category_id="aluminum_can", item="blurry thing", confidence=0.1)
    body = scan(client, photo).json()
    assert body["category_id"] == "unknown"
    assert body["bin"] == "unsure"
    assert body["points"] == 0


def test_empty_upload_is_400(client, fake_gemini):
    assert scan(client, b"").status_code == 400


def test_non_image_is_400(client, fake_gemini):
    res = scan(client, b"%PDF-1.4 definitely not a photo")
    assert res.status_code == 400


def test_huge_upload_is_413(client, fake_gemini, monkeypatch):
    monkeypatch.setattr(classify_router, "MAX_UPLOAD_BYTES", 100)
    assert scan(client, b"x" * 101).status_code == 413


def test_missing_image_is_422(client):
    assert client.post("/classify").status_code == 422


def test_bad_latitude_is_422(client, photo, fake_gemini):
    fake_gemini(category_id="battery", item="AA", confidence=0.9)
    assert scan(client, photo, lat="200", lon="0").status_code == 422


def test_gemini_down_is_502(client, photo, monkeypatch):
    def broken(image):
        raise gemini.GeminiError("quota exceeded")

    monkeypatch.setattr(gemini, "ask_gemini", broken)
    res = scan(client, photo)
    assert res.status_code == 502
    assert "quota" not in res.json()["detail"]  # don't leak internals to the app
