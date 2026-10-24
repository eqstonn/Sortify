from functools import lru_cache

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Everything the app reads from .env (or real environment variables on Render)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str
    gemini_model: str = "gemini-3.8-flash"
    supabase_url: str | None = None
    supabase_service_key: str | None = None
    daily_point_cap: int = 200
    # Expo Go on a phone sends no Origin header, so CORS only matters for Expo web
    # and browsers. "*" is fine because we use bearer tokens, not cookies.
    cors_origins: list[str] = ["*"]


def load_settings(**overrides) -> Settings:
    try:
        settings = Settings(**overrides)
    except ValidationError as e:
        missing = [err["loc"][0] for err in e.errors() if err["type"] == "missing"]
        if "gemini_api_key" in missing:
            raise RuntimeError(
                "GEMINI_API_KEY is missing. Add it to your .env file (see .env.example)."
            ) from e
        raise
    if not settings.gemini_api_key.strip():
        raise RuntimeError("GEMINI_API_KEY is empty. Add your key to the .env file.")
    return settings


@lru_cache
def get_settings() -> Settings:
    return load_settings()
