import io


def test_csv_export_and_import_with_duplicate_override(client):
    cat_res = client.get("/api/v1/categories")
    food_cat = next(c for c in cat_res.json() if c["name"] == "Food")

    # 1. Create an existing expense in DB
    client.post("/api/v1/expenses", json={
        "category_id": food_cat["id"],
        "amount_paise": 25000,  # ₹250.00
        "date": "2026-10-10",
        "description": "Coffee with friend",
        "payment_method": "UPI"
    })

    # 2. Test CSV Export
    export_res = client.get("/api/v1/export/expenses.csv")
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers["content-type"]
    assert "Coffee with friend" in export_res.text
    assert "Amount (INR)" in export_res.text

    # 3. Test CSV Import Preview with Duplicate Flagging
    csv_payload = (
        "Date,Description,Amount,Category,Payment Method\n"
        "2026-10-10,Coffee with friend,250.00,Food,UPI\n"
        "2026-10-11,Books purchase,799.00,Shopping,card\n"
    )

    files = {"file": ("test.csv", io.BytesIO(csv_payload.encode("utf-8")), "text/csv")}
    preview_res = client.post("/api/v1/import/preview", files=files)
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert preview_data["total_rows"] == 2
    assert preview_data["probable_duplicates"] == 1

    row1 = preview_data["rows"][0]
    row2 = preview_data["rows"][1]
    assert row1["is_duplicate"] is True
    assert "Matches existing expense" in row1["duplicate_reason"]
    assert row2["is_duplicate"] is False

    # 4. Test Import Confirm allowing duplicate override (import anyway)
    confirm_payload = {
        "rows": [
            {
                "date": row1["date"],
                "amount_paise": row1["amount_paise"],
                "description": row1["description"],
                "category_id": food_cat["id"],
                "payment_method": row1["payment_method"],
                "import_confirmed": True  # User explicitly chooses "Import anyway"
            },
            {
                "date": row2["date"],
                "amount_paise": row2["amount_paise"],
                "description": row2["description"],
                "category_id": food_cat["id"],
                "payment_method": row2["payment_method"],
                "import_confirmed": True
            }
        ]
    }
    confirm_res = client.post("/api/v1/import/confirm", json=confirm_payload)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["imported_count"] == 2
