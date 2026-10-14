from datetime import date, timedelta


def test_recurring_rule_process_idempotent(client):
    cat_res = client.get("/api/v1/categories")
    bills_cat = next(c for c in cat_res.json() if c["name"] == "Bills")

    # Start date 3 weeks ago
    start = date(2026, 9, 23)
    target = date(2026, 10, 14)

    # 1. Create weekly recurring rule
    rule_res = client.post("/api/v1/recurring", json={
        "category_id": bills_cat["id"],
        "amount_paise": 29900,  # ₹299/week
        "description": "Weekly subscription",
        "payment_method": "card",
        "frequency": "weekly",
        "start_date": start.isoformat()
    })
    assert rule_res.status_code == 201
    rule = rule_res.json()
    rule_id = rule["id"]
    assert rule["next_due_date"] == start.isoformat()

    # 2. Process rules up to target date
    proc_res = client.post(f"/api/v1/recurring/process?target_date={target.isoformat()}")
    assert proc_res.status_code == 200
    proc_data = proc_res.json()
    # 4 missed weekly occurrences: Sept 23, Sept 30, Oct 7, Oct 14
    assert proc_data["entries_generated"] == 4

    # Check updated rule's next_due_date (should be Oct 21)
    list_rules = client.get("/api/v1/recurring")
    updated_rule = next(r for r in list_rules.json() if r["id"] == rule_id)
    assert updated_rule["next_due_date"] == "2026-10-21"

    # 3. Test IDEMPOTENCY: run process again for the same target date
    proc_res_2 = client.post(f"/api/v1/recurring/process?target_date={target.isoformat()}")
    assert proc_res_2.status_code == 200
    assert proc_res_2.json()["entries_generated"] == 0

    # 4. Check expenses created
    exp_res = client.get(f"/api/v1/expenses?category_id={bills_cat['id']}&search=Weekly+subscription")
    assert exp_res.status_code == 200
    assert exp_res.json()["total"] == 4
