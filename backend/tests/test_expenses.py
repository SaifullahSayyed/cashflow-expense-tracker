from datetime import date, timedelta


def test_create_and_read_expense(client):
    # Fetch a category
    cat_res = client.get("/api/v1/categories")
    cat_id = cat_res.json()[0]["id"]

    # Create expense: ₹450.50 -> 45050 paise
    res = client.post("/api/v1/expenses", json={
        "category_id": cat_id,
        "amount_paise": 45050,
        "date": "2026-10-14",
        "description": "Lunch at Bistro",
        "payment_method": "UPI",
        "notes": "Team lunch"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["amount_paise"] == 45050
    assert data["description"] == "Lunch at Bistro"
    assert data["payment_method"] == "UPI"
    assert data["category"]["id"] == cat_id
    exp_id = data["id"]

    # Read expense
    get_res = client.get(f"/api/v1/expenses/{exp_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == exp_id

    # Update expense
    up_res = client.put(f"/api/v1/expenses/{exp_id}", json={
        "amount_paise": 50000,
        "description": "Dinner at Bistro"
    })
    assert up_res.status_code == 200
    assert up_res.json()["amount_paise"] == 50000
    assert up_res.json()["description"] == "Dinner at Bistro"

    # Delete expense
    del_res = client.delete(f"/api/v1/expenses/{exp_id}")
    assert del_res.status_code == 200

    # Ensure 404 after delete
    assert client.get(f"/api/v1/expenses/{exp_id}").status_code == 404


def test_expense_filters_and_pagination(client):
    cat_res = client.get("/api/v1/categories")
    food_cat = next(c for c in cat_res.json() if c["name"] == "Food")
    transport_cat = next(c for c in cat_res.json() if c["name"] == "Transport")

    # Add 3 test expenses
    client.post("/api/v1/expenses", json={
        "category_id": food_cat["id"],
        "amount_paise": 10000,
        "date": "2026-10-10",
        "description": "Groceries supermarket",
        "payment_method": "card"
    })
    client.post("/api/v1/expenses", json={
        "category_id": food_cat["id"],
        "amount_paise": 20000,
        "date": "2026-10-12",
        "description": "Pizza delivery",
        "payment_method": "UPI"
    })
    client.post("/api/v1/expenses", json={
        "category_id": transport_cat["id"],
        "amount_paise": 50000,
        "date": "2026-10-14",
        "description": "Metro card recharge",
        "payment_method": "UPI"
    })

    # Search filter
    search_res = client.get("/api/v1/expenses?search=pizza")
    assert search_res.status_code == 200
    assert search_res.json()["total"] == 1
    assert "Pizza" in search_res.json()["items"][0]["description"]

    # Category filter
    cat_filter_res = client.get(f"/api/v1/expenses?category_id={food_cat['id']}")
    assert cat_filter_res.status_code == 200
    assert cat_filter_res.json()["total"] == 2

    # Amount range filter
    amt_filter_res = client.get("/api/v1/expenses?min_amount_paise=15000&max_amount_paise=30000")
    assert amt_filter_res.status_code == 200
    assert amt_filter_res.json()["total"] == 1
    assert amt_filter_res.json()["items"][0]["amount_paise"] == 20000

    # Pagination
    page_res = client.get("/api/v1/expenses?page=1&page_size=2")
    assert page_res.status_code == 200
    assert len(page_res.json()["items"]) == 2
    assert page_res.json()["page"] == 1
    assert page_res.json()["page_size"] == 2
