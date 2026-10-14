def test_create_and_update_budgets(client):
    cat_res = client.get("/api/v1/categories")
    food_cat = next(c for c in cat_res.json() if c["name"] == "Food")

    # 1. Set overall monthly budget (category_id is None)
    res = client.post("/api/v1/budgets", json={
        "category_id": None,
        "month": 10,
        "year": 2026,
        "limit_amount_paise": 5000000  # ₹50,000 cap
    })
    assert res.status_code == 201
    overall = res.json()
    assert overall["category_id"] is None
    assert overall["limit_amount_paise"] == 5000000

    # 2. Update overall monthly budget via PUT endpoint
    up_res = client.put(f"/api/v1/budgets/{overall['id']}", json={
        "limit_amount_paise": 6000000  # Updated cap
    })
    assert up_res.status_code == 200
    assert up_res.json()["limit_amount_paise"] == 6000000
    assert up_res.json()["id"] == overall["id"]

    # 3. Set category-specific budget
    cat_budget_res = client.post("/api/v1/budgets", json={
        "category_id": food_cat["id"],
        "month": 10,
        "year": 2026,
        "limit_amount_paise": 1500000  # ₹15,000 cap
    })
    assert cat_budget_res.status_code == 201
    cat_budget = cat_budget_res.json()
    assert cat_budget["category_id"] == food_cat["id"]

    # 4. Add expense to Food and verify progress calculation
    client.post("/api/v1/expenses", json={
        "category_id": food_cat["id"],
        "amount_paise": 750000,  # ₹7,500 = exactly 50%
        "date": "2026-10-14",
        "description": "Weekly grocery run",
        "payment_method": "UPI"
    })

    # Query budgets for month 10, 2026
    list_res = client.get("/api/v1/budgets?month=10&year=2026")
    assert list_res.status_code == 200
    budgets = list_res.json()

    # Find food budget
    food_b = next(b for b in budgets if b["category_id"] == food_cat["id"])
    assert food_b["spent_paise"] >= 750000
    assert food_b["percentage_used"] >= 50.0
    assert food_b["remaining_paise"] <= 750000

    # Find overall budget
    ov_b = next(b for b in budgets if b["category_id"] is None)
    assert ov_b["spent_paise"] >= 750000
