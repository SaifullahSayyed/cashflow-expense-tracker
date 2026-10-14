import csv
import io
from datetime import datetime, date
from typing import List, Dict, Any, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.category import Category
from app.models.expense import Expense
from app.schemas.export_import import CsvPreviewRow, CsvPreviewResponse, CsvImportRowItem


def parse_amount_to_paise(val: str) -> int:
    """Converts a string amount (e.g. '150.50' or '150' or '1,200.00') to integer paise."""
    cleaned = val.replace(",", "").replace("₹", "").replace("$", "").strip()
    try:
        amt_float = float(cleaned)
        return int(round(amt_float * 100))
    except ValueError:
        return 0


def parse_date_string(val: str) -> date:
    """Parses multiple standard date formats."""
    cleaned = val.strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    # Fallback to today if unparseable
    return date.today()


def preview_csv_content(db: Session, content: str) -> CsvPreviewResponse:
    reader = csv.DictReader(io.StringIO(content))
    rows_out: List[CsvPreviewRow] = []

    # Map categories by lowercase name
    categories = db.query(Category).all()
    cat_map = {c.name.lower(): c for c in categories}
    other_cat = cat_map.get("other") or (categories[0] if categories else None)

    row_idx = 0
    probable_duplicates = 0

    for row in reader:
        row_idx += 1
        # Normalize header keys to lowercase
        norm_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}

        # Find columns
        raw_date = norm_row.get("date") or norm_row.get("transaction date") or norm_row.get("tx date") or ""
        parsed_date = parse_date_string(raw_date)

        raw_amount = norm_row.get("amount") or norm_row.get("amount (inr)") or norm_row.get("cost") or norm_row.get("price") or "0"
        amount_paise = parse_amount_to_paise(raw_amount)

        description = (
            norm_row.get("description")
            or norm_row.get("details")
            or norm_row.get("narrative")
            or norm_row.get("title")
            or f"Imported transaction {row_idx}"
        )

        raw_cat = norm_row.get("category") or norm_row.get("category name") or ""
        matched_cat = cat_map.get(raw_cat.lower()) or other_cat

        payment_method = norm_row.get("payment method") or norm_row.get("payment mode") or norm_row.get("mode") or "UPI"
        notes = norm_row.get("notes") or norm_row.get("remarks") or None

        # Check duplicate against DB
        existing = db.query(Expense).filter(
            Expense.date == parsed_date,
            Expense.amount_paise == amount_paise,
            func.lower(Expense.description) == description.lower()
        ).first()

        is_dup = existing is not None
        dup_reason = (
            f"Matches existing expense #{existing.id} on {parsed_date} for ₹{amount_paise / 100:.2f}"
            if existing
            else None
        )

        if is_dup:
            probable_duplicates += 1

        rows_out.append(
            CsvPreviewRow(
                row_index=row_idx,
                date=parsed_date,
                amount_paise=amount_paise,
                description=description,
                category_name=matched_cat.name if matched_cat else "Other",
                category_id=matched_cat.id if matched_cat else None,
                payment_method=payment_method,
                notes=notes,
                is_duplicate=is_dup,
                duplicate_reason=dup_reason
            )
        )

    categories_payload = [{"id": c.id, "name": c.name, "color": c.color} for c in categories]

    return CsvPreviewResponse(
        total_rows=len(rows_out),
        probable_duplicates=probable_duplicates,
        valid_rows=len([r for r in rows_out if r.amount_paise > 0]),
        rows=rows_out,
        available_categories=categories_payload
    )


def import_csv_rows(db: Session, rows: List[CsvImportRowItem]) -> Tuple[int, int]:
    imported = 0
    skipped = 0

    for item in rows:
        if not item.import_confirmed:
            skipped += 1
            continue

        if item.amount_paise <= 0:
            skipped += 1
            continue

        expense = Expense(
            category_id=item.category_id,
            amount_paise=item.amount_paise,
            date=item.date,
            description=item.description,
            payment_method=item.payment_method,
            notes=item.notes
        )
        db.add(expense)
        imported += 1

    db.commit()
    return imported, skipped


def generate_expenses_csv(expenses: List[Expense]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID",
        "Date",
        "Description",
        "Amount (INR)",
        "Amount (Paise)",
        "Category",
        "Payment Method",
        "Notes",
        "Created At"
    ])

    for exp in expenses:
        writer.writerow([
            exp.id,
            exp.date.isoformat(),
            exp.description,
            f"{exp.amount_paise / 100:.2f}",
            exp.amount_paise,
            exp.category.name if exp.category else "",
            exp.payment_method,
            exp.notes or "",
            exp.created_at.isoformat() if exp.created_at else ""
        ])

    return output.getvalue()
