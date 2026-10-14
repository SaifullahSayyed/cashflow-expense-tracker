def test_create_and_manage_income(client):
    res = client.post("/api/v1/income", json={
        "amount_paise": 7500000,  # ₹75,000.00
        "date": "2026-10-01",
        "source": "Salary",
        "description": "October Salary",
        "payment_method": "bank"
    })
    assert res.status_code == 201
    created = res.json()
    assert created["amount_paise"] == 7500000
    assert created["source"] == "Salary"
    income_id = created["id"]

    # Read
    get_res = client.get(f"/api/v1/income/{income_id}")
    assert get_res.status_code == 200
    assert get_res.json()["description"] == "October Salary"

    # Update
    up_res = client.put(f"/api/v1/income/{income_id}", json={
        "amount_paise": 8000000
    })
    assert up_res.status_code == 200
    assert up_res.json()["amount_paise"] == 8000000

    # List
    list_res = client.get("/api/v1/income")
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1

    # Delete
    del_res = client.delete(f"/api/v1/income/{income_id}")
    assert del_res.status_code == 200
