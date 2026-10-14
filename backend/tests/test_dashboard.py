def test_dashboard_summary(client):
    cat_res = client.get("/api/v1/categories")
    bills_cat = next(c for c in cat_res.json() if c["name"] == "Bills")

    # Add expense
    client.post("/api/v1/expenses", json={
        "category_id": bills_cat["id"],
        "amount_paise": 300000,  # ₹3,000
        "date": "2026-10-05",
        "description": "Electricity bill",
        "payment_method": "UPI"
    })

    # Add income
    client.post("/api/v1/income", json={
        "amount_paise": 5000000,  # ₹50,000
        "date": "2026-10-01",
        "source": "Freelance",
        "description": "Web dev project",
        "payment_method": "bank"
    })

    # Fetch dashboard summary for month 10, 2026
    dash_res = client.get("/api/v1/dashboard/summary?month=10&year=2026")
    assert dash_res.status_code == 200
    data = dash_res.json()

    assert data["total_expenses_paise"] >= 300000
    assert data["total_income_paise"] >= 5000000
    assert data["net_balance_paise"] == data["total_income_paise"] - data["total_expenses_paise"]
    assert len(data["category_breakdown"]) >= 1
    assert len(data["spending_trend"]) >= 1
    assert len(data["recent_transactions"]) >= 2
