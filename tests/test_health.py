def test_health_ok(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_cors_headers_for_expo_web(client):
    res = client.get("/health", headers={"Origin": "http://localhost:8081"})
    assert res.headers["access-control-allow-origin"] == "*"


def test_cors_preflight(client):
    res = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:8081",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert res.status_code == 200
    assert "POST" in res.headers["access-control-allow-methods"]


def test_crash_still_has_cors_headers(db, auth):
    # e.g. a missing table: the app should see a 500 with a message, not "Can't reach Sortify"
    from app.db import get_db
    from app.main import create_app
    from fastapi.testclient import TestClient

    def broken_badges(user_id):
        raise RuntimeError("Could not find the table 'public.badges'")

    db.earned_badges = broken_badges
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app, raise_server_exceptions=False)

    res = client.get("/me", headers={**auth, "Origin": "http://localhost:8081"})
    assert res.status_code == 500
    assert res.headers["access-control-allow-origin"] == "*"
    assert "public.badges" in res.json()["detail"]
