import io
from datetime import date
from decimal import Decimal
from app.services.csv_service import parse_amount_to_paise
from app.services.recurring_service import advance_recurring_date


def test_edge_case_recurring_monthly_three_months_overdue(client):
    cat_res = client.get("/api/v1/categories")
    bills_cat = next(c for c in cat_res.json() if c["name"] == "Bills")

    # Start date 3 months ago (July 14)
    start = date(2026, 7, 14)
    target = date(2026, 10, 14)

    # Create monthly recurring rule
    rule_res = client.post("/api/v1/recurring", json={
        "category_id": bills_cat["id"],
        "amount_paise": 150000,
        "description": "Internet Fiber Broadband",
        "payment_method": "UPI",
        "frequency": "monthly",
        "start_date": start.isoformat()
    })
    assert rule_res.status_code == 201

    # Process due rules up to Oct 14: exactly 4 occurrences (July 14, Aug 14, Sept 14, Oct 14) or 3 if starting Aug 14.
    # If 3 months overdue (e.g. July 14 to Oct 13 = July 14, Aug 14, Sept 14 -> exactly 3):
    start_3_mo = date(2026, 7, 15)
    rule_3mo = client.post("/api/v1/recurring", json={
        "category_id": bills_cat["id"],
        "amount_paise": 50000,
        "description": "3-Months Overdue Utility",
        "payment_method": "UPI",
        "frequency": "monthly",
        "start_date": start_3_mo.isoformat()
    }).json()

    # Process up to Oct 14 (due dates will be: July 15, Aug 15, Sept 15 -> exactly 3 entries!)
    proc_res = client.post(f"/api/v1/recurring/process?target_date={target.isoformat()}")
    assert proc_res.status_code == 200

    # Verify expenses created for the 3-month overdue utility
    exp_res = client.get(f"/api/v1/expenses?search=3-Months+Overdue+Utility")
    assert exp_res.status_code == 200
    assert exp_res.json()["total"] == 3

    # Second process call must generate 0 entries (idempotent)
    proc_res_2 = client.post(f"/api/v1/recurring/process?target_date={target.isoformat()}")
    assert proc_res_2.status_code == 200
    assert proc_res_2.json()["entries_generated"] == 0


def test_edge_case_recurring_31st_day_no_drift():
    # Jan 31 -> Feb 28 -> March 31 -> April 30 -> May 31
    jan_31 = date(2026, 1, 31)
    feb_due = advance_recurring_date(jan_31, jan_31, "monthly")
    assert feb_due == date(2026, 2, 28)

    mar_due = advance_recurring_date(jan_31, feb_due, "monthly")
    assert mar_due == date(2026, 3, 31)  # Recovers to 31st! No drift!

    apr_due = advance_recurring_date(jan_31, mar_due, "monthly")
    assert apr_due == date(2026, 4, 30)

    may_due = advance_recurring_date(jan_31, apr_due, "monthly")
    assert may_due == date(2026, 5, 31)  # Again 31st!


def test_edge_case_budget_duplicates_return_clean_4xx_never_500(client):
    cat_res = client.get("/api/v1/categories")
    shopping_cat = next(c for c in cat_res.json() if c["name"] == "Shopping")

    # 1. Create category budget
    b1 = client.post("/api/v1/budgets", json={
        "category_id": shopping_cat["id"],
        "month": 11,
        "year": 2026,
        "limit_amount_paise": 2000000
    })
    assert b1.status_code == 201

    # Duplicate category budget -> must return clean 4xx with readable error, NOT 500
    b1_dup = client.post("/api/v1/budgets", json={
        "category_id": shopping_cat["id"],
        "month": 11,
        "year": 2026,
        "limit_amount_paise": 3000000
    })
    assert b1_dup.status_code in (400, 409)
    assert "already exists" in b1_dup.json()["detail"]

    # 2. Create overall budget (category_id is None)
    b2 = client.post("/api/v1/budgets", json={
        "category_id": None,
        "month": 11,
        "year": 2026,
        "limit_amount_paise": 8000000
    })
    assert b2.status_code == 201

    # Duplicate overall budget -> must return clean 4xx with readable error, NOT 500
    b2_dup = client.post("/api/v1/budgets", json={
        "category_id": None,
        "month": 11,
        "year": 2026,
        "limit_amount_paise": 9000000
    })
    assert b2_dup.status_code in (400, 409)
    assert "already exists" in b2_dup.json()["detail"]


def test_edge_case_zero_and_negative_amounts_rejected(client):
    cat_res = client.get("/api/v1/categories")
    cat_id = cat_res.json()[0]["id"]

    # Expense: zero amount
    res_zero_exp = client.post("/api/v1/expenses", json={
        "category_id": cat_id,
        "amount_paise": 0,
        "date": "2026-10-14",
        "description": "Zero expense"
    })
    assert res_zero_exp.status_code == 422

    # Expense: negative amount
    res_neg_exp = client.post("/api/v1/expenses", json={
        "category_id": cat_id,
        "amount_paise": -500,
        "date": "2026-10-14",
        "description": "Negative expense"
    })
    assert res_neg_exp.status_code == 422

    # Income: zero amount
    res_zero_inc = client.post("/api/v1/income", json={
        "amount_paise": 0,
        "date": "2026-10-14",
        "source": "Salary",
        "description": "Zero income"
    })
    assert res_zero_inc.status_code == 422

    # Income: negative amount
    res_neg_inc = client.post("/api/v1/income", json={
        "amount_paise": -10000,
        "date": "2026-10-14",
        "source": "Salary",
        "description": "Negative income"
    })
    assert res_neg_inc.status_code == 422


def test_edge_case_csv_amount_decimal_parsing():
    # "1,250.50" must be exactly 125050 paise
    assert parse_amount_to_paise("1,250.50") == 125050
    assert parse_amount_to_paise("₹1,250.50") == 125050
    assert parse_amount_to_paise("$1,250.50") == 125050
    assert parse_amount_to_paise("0.75") == 75
    assert parse_amount_to_paise("100") == 10000


def test_edge_case_category_deletion_with_expenses(client):
    # Create custom category
    cat = client.post("/api/v1/categories", json={
        "name": "Temporary Hobby",
        "color": "#F43F5E"
    }).json()

    # Link an expense to it
    client.post("/api/v1/expenses", json={
        "category_id": cat["id"],
        "amount_paise": 120000,
        "date": "2026-10-14",
        "description": "Guitar strings"
    })

    # 1. Attempt delete without reassign_to -> must fail with clear error
    del_fail = client.delete(f"/api/v1/categories/{cat['id']}")
    assert del_fail.status_code == 400
    assert "Please specify 'reassign_to'" in del_fail.json()["detail"]

    # 2. Get another category (e.g. Entertainment)
    all_cats = client.get("/api/v1/categories").json()
    ent_cat = next(c for c in all_cats if c["name"] == "Entertainment")

    # Delete with reassign_to
    del_ok = client.delete(f"/api/v1/categories/{cat['id']}?reassign_to={ent_cat['id']}")
    assert del_ok.status_code == 200

    # Verify expense moved to Entertainment
    exp_check = client.get("/api/v1/expenses?search=Guitar+strings").json()
    assert exp_check["items"][0]["category"]["id"] == ent_cat["id"]


def test_edge_case_filters_inclusivity_and_combined(client):
    cat_res = client.get("/api/v1/categories")
    food_cat = next(c for c in cat_res.json() if c["name"] == "Food")
    health_cat = next(c for c in cat_res.json() if c["name"] == "Health")

    client.post("/api/v1/expenses", json={
        "category_id": food_cat["id"],
        "amount_paise": 15000,
        "date": "2026-10-01",
        "description": "Healthy salad bowl",
        "payment_method": "UPI"
    })
    client.post("/api/v1/expenses", json={
        "category_id": food_cat["id"],
        "amount_paise": 30000,
        "date": "2026-10-15",  # Exactly on end_date
        "description": "Healthy dinner with organic greens",
        "payment_method": "card"
    })
    client.post("/api/v1/expenses", json={
        "category_id": health_cat["id"],
        "amount_paise": 40000,
        "date": "2026-10-10",
        "description": "Doctor checkup healthy",
        "payment_method": "UPI"
    })

    # Test end_date inclusive: Oct 01 to Oct 15 includes the Oct 15 expense
    inclusive_res = client.get("/api/v1/expenses?start_date=2026-10-01&end_date=2026-10-15&search=Healthy+dinner")
    assert inclusive_res.status_code == 200
    assert inclusive_res.json()["total"] == 1
    assert inclusive_res.json()["items"][0]["date"] == "2026-10-15"

    # Combined filters: date range + category (Food) + search ("healthy")
    combined_res = client.get(
        f"/api/v1/expenses?start_date=2026-10-01&end_date=2026-10-15&category_id={food_cat['id']}&search=healthy"
    )
    assert combined_res.status_code == 200
    data = combined_res.json()
    assert data["total"] == 2  # The 2 Food items, excluding the Health item
    for item in data["items"]:
        assert item["category"]["id"] == food_cat["id"]
        assert "healthy" in item["description"].lower()
