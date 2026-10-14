from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc
from app.database import get_db
from app.models.expense import Expense
from app.schemas.export_import import (
    CsvPreviewResponse,
    CsvImportConfirmRequest,
    CsvImportConfirmResponse
)
from app.services.csv_service import (
    preview_csv_content,
    import_csv_rows,
    generate_expenses_csv
)

router = APIRouter(prefix="", tags=["Export & Import"])


@router.get("/export/expenses.csv")
def export_expenses_csv(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category_id: Optional[List[int]] = Query(None),
    payment_method: Optional[List[str]] = Query(None),
    min_amount_paise: Optional[int] = Query(None, ge=0),
    max_amount_paise: Optional[int] = Query(None, ge=0),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Expense).options(joinedload(Expense.category))

    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    if category_id:
        query = query.filter(Expense.category_id.in_(category_id))
    if payment_method:
        query = query.filter(Expense.payment_method.in_(payment_method))
    if min_amount_paise is not None:
        query = query.filter(Expense.amount_paise >= min_amount_paise)
    if max_amount_paise is not None:
        query = query.filter(Expense.amount_paise <= max_amount_paise)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Expense.description.ilike(term),
                Expense.notes.ilike(term)
            )
        )

    expenses = query.order_by(desc(Expense.date), desc(Expense.id)).all()
    csv_string = generate_expenses_csv(expenses)

    filename = f"expenses_{date.today().isoformat()}.csv"
    return Response(
        content=csv_string,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/import/preview", response_model=CsvPreviewResponse)
async def preview_csv_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a CSV file (.csv)"
        )

    try:
        raw_bytes = await file.read()
        content = raw_bytes.decode("utf-8", errors="replace")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {str(exc)}"
        )

    return preview_csv_content(db, content)


@router.post("/import/confirm", response_model=CsvImportConfirmResponse)
def confirm_csv_import(
    payload: CsvImportConfirmRequest,
    db: Session = Depends(get_db)
):
    imported, skipped = import_csv_rows(db, payload.rows)
    return CsvImportConfirmResponse(
        imported_count=imported,
        skipped_count=skipped,
        message=f"Successfully imported {imported} transactions ({skipped} skipped)."
    )
