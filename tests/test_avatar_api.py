"""POST /me/avatar and DELETE /me/avatar: profile photos."""

import io

import pytest
from PIL import Image

from tests.conftest import make_photo

GPS_IFD = 0x8825


def upload(client, auth, data: bytes, name="me.jpg", kind="image/jpeg"):
    return client.post("/me/avatar", headers=auth, files={"image": (name, data, kind)})


def test_signed_out_gets_401(client, photo):
    assert client.post("/me/avatar", files={"image": ("me.jpg", photo, "image/jpeg")}).status_code == 401
    assert client.delete("/me/avatar").status_code == 401


def test_upload_saves_the_photo_and_its_url_on_the_profile(client, db, auth, photo):
    res = upload(client, auth, photo)

    assert res.status_code == 200
    url = res.json()["avatar"]
    assert url.startswith("https://storage.test/avatars/alice.jpg")
    assert db.profiles["alice"]["avatar"] == url
    assert client.get("/me", headers=auth).json()["avatar"] == url


def test_the_saved_photo_is_a_small_square_with_no_location(client, db, auth):
    exif = Image.Exif()
    exif[0x010F] = "PhoneMaker"
    exif.get_ifd(GPS_IFD)[2] = (45.0, 25.0, 0.0)  # latitude
    original = make_photo(3000, 2000, exif=exif)
    assert GPS_IFD in Image.open(io.BytesIO(original)).getexif()  # the test photo really has it

    upload(client, auth, original)

    saved = Image.open(io.BytesIO(db.avatars["alice"]))
    assert saved.format == "JPEG"
    assert saved.size == (512, 512)
    assert len(saved.getexif()) == 0


def test_png_works_too(client, db, auth):
    assert upload(client, auth, make_photo(fmt="PNG"), "me.png", "image/png").status_code == 200
    assert Image.open(io.BytesIO(db.avatars["alice"])).format == "JPEG"


@pytest.mark.parametrize("data, status", [(b"", 400), (b"not a picture", 400)])
def test_bad_files_are_refused_and_nothing_changes(client, db, auth, data, status):
    res = upload(client, auth, data)

    assert res.status_code == status
    assert db.avatars == {}
    assert db.profiles["alice"]["avatar"] == "sprout"


def test_too_big_is_refused(client, auth):
    assert upload(client, auth, b"x" * (10 * 1024 * 1024 + 1)).status_code == 413


def test_removing_the_photo_goes_back_to_the_default(client, db, auth, photo):
    upload(client, auth, photo)

    res = client.delete("/me/avatar", headers=auth)

    assert res.status_code == 200
    assert res.json()["avatar"] == "sprout"
    assert "alice" not in db.avatars


def test_the_photo_shows_on_the_leaderboard(client, db, auth, photo):
    url = upload(client, auth, photo).json()["avatar"]
    db.add_confirmed_scan("alice", "battery", 50)

    board = client.get("/leaderboard?range=all", headers=auth).json()

    assert board["me"]["avatar"] == url
