import calendar
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from app.database import get_db
from app.models.budget import Budget
from app.models.category import Category
from app.models.expense import Expense
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetOut
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def compute_budget_stats(db: Session, budget: Budget) -> BudgetOut:
    # Query total expenses for this month/year and category (or overall)
    exp_query = db.query(func.coalesce(func.sum(Expense.amount_paise), 0)).filter(
        extract("month", Expense.date) == budget.month,
        extract("year", Expense.date) == budget.year
    )

    if budget.category_id is not None:
        exp_query = exp_query.filter(Expense.category_id == budget.category_id)

    spent_paise = exp_query.scalar() or 0
    remaining_paise = budget.limit_amount_paise - spent_paise
    pct = round((spent_paise / budget.limit_amount_paise) * 100, 2) if budget.limit_amount_paise > 0 else 0.0

    b_out = BudgetOut.model_validate(budget)
    b_out.spent_paise = spent_paise
    b_out.remaining_paise = remaining_paise
    b_out.percentage_used = pct
    return b_out


@router.get("", response_model=List[BudgetOut])
def list_budgets(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db)
):
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year

    query = db.query(Budget).options(joinedload(Budget.category)).filter(
        Budget.month == target_month,
        Budget.year == target_year
    )

    budgets = query.all()
    # Sort so overall budget (category_id IS NULL) comes first, then by category name
    budgets.sort(key=lambda b: (0 if b.category_id is None else 1, b.category.name if b.category else ""))

    return [compute_budget_stats(db, b) for b in budgets]


@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_or_upsert_budget(payload: BudgetCreate, db: Session = Depends(get_db)):
    if payload.category_id is not None:
        category = db.query(Category).filter(Category.id == payload.category_id).first()
        if not category:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category_id")

    # Look for existing budget enforcing (category_id, month, year) uniqueness
    query = db.query(Budget).filter(
        Budget.month == payload.month,
        Budget.year == payload.year
    )

    if payload.category_id is None:
        query = query.filter(Budget.category_id.is_(None))
    else:
        query = query.filter(Budget.category_id == payload.category_id)

    existing = query.first()
    if existing:
        # Update existing
        existing.limit_amount_paise = payload.limit_amount_paise
        db.commit()
        db.refresh(existing)
        return compute_budget_stats(db, existing)

    new_budget = Budget(
        category_id=payload.category_id,
        month=payload.month,
        year=payload.year,
        limit_amount_paise=payload.limit_amount_paise
    )
    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)
    return compute_budget_stats(db, new_budget)


@router.put("/{budget_id}", response_model=BudgetOut)
def update_budget(budget_id: int, payload: BudgetUpdate, db: Session = Depends(get_db)):
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")

    budget.limit_amount_paise = payload.limit_amount_paise
    db.commit()
    db.refresh(budget)
    return compute_budget_stats(db, budget)


@router.delete("/{budget_id}", response_model=MessageResponse)
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")

    db.delete(budget)
    db.commit()
    return MessageResponse(message="Budget deleted successfully")
