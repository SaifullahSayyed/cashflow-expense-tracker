def test_settings_get_and_update(client):
    # Get settings
    res = client.get("/api/v1/settings")
    assert res.status_code == 200
    data = res.json()["settings"]
    assert "currency_symbol" in data
    assert data["currency_symbol"] == "₹"

    # Update settings
    up_res = client.put("/api/v1/settings", json={
        "settings": {
            "currency_symbol": "$",
            "currency_code": "USD"
        }
    })
    assert up_res.status_code == 200
    updated_data = up_res.json()["settings"]
    assert updated_data["currency_symbol"] == "$"
    assert updated_data["currency_code"] == "USD"
