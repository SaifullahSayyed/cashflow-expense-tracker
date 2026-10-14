import math
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from app.database import get_db
from app.models.income import Income
from app.schemas.income import IncomeCreate, IncomeUpdate, IncomeOut
from app.schemas.common import PaginatedResponse, MessageResponse

router = APIRouter(prefix="/income", tags=["Income"])


@router.get("", response_model=PaginatedResponse[IncomeOut])
def list_income(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("date", pattern=r"^(date|amount_paise|created_at)$"),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    query = db.query(Income)

    if start_date:
        query = query.filter(Income.date >= start_date)
    if end_date:
        query = query.filter(Income.date <= end_date)
    if source:
        query = query.filter(Income.source.ilike(f"%{source.strip()}%"))
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Income.description.ilike(term),
                Income.source.ilike(term)
            )
        )

    sort_column = getattr(Income, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column), desc(Income.id))
    else:
        query = query.order_by(asc(sort_column), asc(Income.id))

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return PaginatedResponse(
        items=[IncomeOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=IncomeOut, status_code=status.HTTP_201_CREATED)
def create_income(payload: IncomeCreate, db: Session = Depends(get_db)):
    income = Income(
        amount_paise=payload.amount_paise,
        date=payload.date,
        source=payload.source.strip(),
        description=payload.description.strip(),
        payment_method=payload.payment_method
    )
    db.add(income)
    db.commit()
    db.refresh(income)
    return IncomeOut.model_validate(income)


@router.get("/{income_id}", response_model=IncomeOut)
def get_income(income_id: int, db: Session = Depends(get_db)):
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income entry not found")
    return IncomeOut.model_validate(income)


@router.put("/{income_id}", response_model=IncomeOut)
def update_income(
    income_id: int,
    payload: IncomeUpdate,
    db: Session = Depends(get_db)
):
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income entry not found")

    if payload.amount_paise is not None:
        income.amount_paise = payload.amount_paise
    if payload.date is not None:
        income.date = payload.date
    if payload.source is not None:
        income.source = payload.source.strip()
    if payload.description is not None:
        income.description = payload.description.strip()
    if payload.payment_method is not None:
        income.payment_method = payload.payment_method

    db.commit()
    db.refresh(income)
    return IncomeOut.model_validate(income)


@router.delete("/{income_id}", response_model=MessageResponse)
def delete_income(income_id: int, db: Session = Depends(get_db)):
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income entry not found")

    db.delete(income)
    db.commit()
    return MessageResponse(message="Income entry deleted successfully")
