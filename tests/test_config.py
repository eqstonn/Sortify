import pytest

from app.config import load_settings


def test_loads_from_environment(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "abc123")
    monkeypatch.setenv("DAILY_POINT_CAP", "150")
    settings = load_settings(_env_file=None)
    assert settings.gemini_api_key == "abc123"
    assert settings.daily_point_cap == 150
    assert settings.gemini_model == "gemini-3.8-flash"


def test_missing_gemini_key_gives_clear_error(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="GEMINI_API_KEY is missing"):
        load_settings(_env_file=None)


def test_empty_gemini_key_gives_clear_error(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "   ")
    with pytest.raises(RuntimeError, match="GEMINI_API_KEY is empty"):
        load_settings(_env_file=None)
