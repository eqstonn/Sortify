import os

# Fake key so tests never need (or spend) a real one. Must be set before app imports.
os.environ["GEMINI_API_KEY"] = "test-key"

import io
import random

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.db import get_db
from app.main import create_app
from tests.fakes import FakeDB


@pytest.fixture
def db() -> FakeDB:
    return FakeDB()


@pytest.fixture
def client(db):
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)


@pytest.fixture
def auth(db) -> dict:
    """Login headers for a signed-in player called "alice"."""
    return db.add_user("alice", token="alice-token")


def make_photo(width=2000, height=1500, fmt="JPEG", exif=None, seed=None) -> bytes:
    """A picture standing in for a phone photo.

    Plain colour by default. Pass a seed for a random pattern: different seeds
    give photos that don't look alike (for the same-photo-twice check).
    """
    if seed is None:
        img = Image.new("RGB", (width, height), (40, 120, 60))
    else:
        rng = random.Random(seed)
        small = Image.new("RGB", (16, 12))
        small.putdata([tuple(rng.randrange(256) for _ in range(3)) for _ in range(16 * 12)])
        img = small.resize((width, height), Image.NEAREST)
    out = io.BytesIO()
    if exif is not None:
        img.save(out, format=fmt, exif=exif)
    else:
        img.save(out, format=fmt)
    return out.getvalue()


@pytest.fixture
def photo() -> bytes:
    return make_photo()
