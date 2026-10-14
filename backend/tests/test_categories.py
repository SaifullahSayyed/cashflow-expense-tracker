def test_get_default_categories(client):
    response = client.get("/api/v1/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 8
    names = [c["name"] for c in data]
    for expected in ["Food", "Transport", "Rent", "Bills", "Shopping", "Health", "Entertainment", "Other"]:
        assert expected in names


def test_create_and_delete_custom_category(client):
    # 1. Create custom category
    res = client.post("/api/v1/categories", json={
        "name": "Gym & Fitness",
        "color": "#10B981",
        "icon": "dumbbell"
    })
    assert res.status_code == 201
    created = res.json()
    assert created["name"] == "Gym & Fitness"
    assert created["is_default"] is False

    # 2. Cannot create duplicate name
    dup_res = client.post("/api/v1/categories", json={
        "name": "gym & fitness",
        "color": "#000000"
    })
    assert dup_res.status_code == 400

    # 3. Update category
    up_res = client.put(f"/api/v1/categories/{created['id']}", json={
        "color": "#059669"
    })
    assert up_res.status_code == 200
    assert up_res.json()["color"] == "#059669"

    # 4. Delete custom category
    del_res = client.delete(f"/api/v1/categories/{created['id']}")
    assert del_res.status_code == 200


def test_cannot_rename_or_delete_default_category(client):
    res = client.get("/api/v1/categories")
    other_cat = next(c for c in res.json() if c["name"] == "Other")

    # Attempt rename
    rename_res = client.put(f"/api/v1/categories/{other_cat['id']}", json={
        "name": "Different Other"
    })
    assert rename_res.status_code == 400
    assert "cannot be renamed" in rename_res.json()["detail"]

    # Attempt delete
    del_res = client.delete(f"/api/v1/categories/{other_cat['id']}")
    assert del_res.status_code == 400
    assert "cannot be deleted" in del_res.json()["detail"]
