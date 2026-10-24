def test_list_categories(client):
    res = client.get("/categories")
    assert res.status_code == 200
    ids = [c["id"] for c in res.json()]
    assert "aluminum_can" in ids


def test_get_one_category(client):
    res = client.get("/categories/aluminum_can")
    assert res.status_code == 200
    body = res.json()
    assert body["bin"] == "blue_bin"
    assert body["recyclable"] is True
    assert body["points"] > 0


def test_unknown_category_404(client):
    assert client.get("/categories/nope").status_code == 404


def test_nearest_dropoff_for_batteries(client):
    res = client.get("/dropoffs/nearest", params={"lat": 45.42, "lon": -75.69, "accepts": "batteries"})
    assert res.status_code == 200
    assert res.json()["site"]["address"]


def test_nearest_dropoff_rejects_bad_coordinates(client):
    assert client.get("/dropoffs/nearest", params={"lat": 200, "lon": 0}).status_code == 422
