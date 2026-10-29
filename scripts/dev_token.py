"""Make a new anonymous player and print their login token, for testing at /docs.

    python -m scripts.dev_token

Copy the printed token, open http://localhost:8000/docs, click "Authorize" and
paste it. Tokens last about an hour; run this again for a fresh one (each run
makes a new player). The Expo app gets its token from
supabase.auth.signInAnonymously() instead.
"""

from supabase import ClientOptions, create_client

from app.config import load_settings


def new_player_token() -> tuple[str, str]:
    """Signs in a brand-new anonymous player. Returns (user id, access token)."""
    settings = load_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise SystemExit("Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env first.")
    # A separate client from the backend's, so signing in here can't change its session
    client = create_client(
        settings.supabase_url,
        settings.supabase_service_key,
        options=ClientOptions(auto_refresh_token=False, persist_session=False),
    )
    res = client.auth.sign_in_anonymously()
    return res.user.id, res.session.access_token


def main() -> None:
    user_id, token = new_player_token()
    print(f"User id: {user_id}\n")
    print(token)


if __name__ == "__main__":
    main()
