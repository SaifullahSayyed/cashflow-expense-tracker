import math
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, or_
from app.database import get_db
from app.models.expense import Expense
from app.models.category import Category
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseOut
from app.schemas.common import PaginatedResponse, MessageResponse

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("", response_model=PaginatedResponse[ExpenseOut])
def list_expenses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category_id: Optional[List[int]] = Query(None),
    payment_method: Optional[List[str]] = Query(None),
    min_amount_paise: Optional[int] = Query(None, ge=0),
    max_amount_paise: Optional[int] = Query(None, ge=0),
    search: Optional[str] = None,
    sort_by: str = Query("date", pattern=r"^(date|amount_paise|created_at)$"),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
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

    # Sorting
    sort_column = getattr(Expense, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column), desc(Expense.id))
    else:
        query = query.order_by(asc(sort_column), asc(Expense.id))

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return PaginatedResponse(
        items=[ExpenseOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == payload.category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category_id")

    expense = Expense(
        category_id=payload.category_id,
        amount_paise=payload.amount_paise,
        date=payload.date,
        description=payload.description.strip(),
        payment_method=payload.payment_method,
        notes=payload.notes,
        recurring_rule_id=payload.recurring_rule_id
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return ExpenseOut.model_validate(expense)


@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(Expense).options(joinedload(Expense.category)).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return ExpenseOut.model_validate(expense)


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    if payload.category_id is not None:
        cat = db.query(Category).filter(Category.id == payload.category_id).first()
        if not cat:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category_id")
        expense.category_id = payload.category_id

    if payload.amount_paise is not None:
        expense.amount_paise = payload.amount_paise
    if payload.date is not None:
        expense.date = payload.date
    if payload.description is not None:
        expense.description = payload.description.strip()
    if payload.payment_method is not None:
        expense.payment_method = payload.payment_method
    if payload.notes is not None:
        expense.notes = payload.notes

    db.commit()
    db.refresh(expense)
    return ExpenseOut.model_validate(expense)


@router.delete("/{expense_id}", response_model=MessageResponse)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    db.delete(expense)
    db.commit()
    return MessageResponse(message="Expense deleted successfully")
