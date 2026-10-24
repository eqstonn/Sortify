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
