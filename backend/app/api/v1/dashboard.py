import calendar
from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, desc
from app.database import get_db
from app.models.expense import Expense
from app.models.income import Income
from app.models.category import Category
from app.schemas.dashboard import (
    DashboardSummaryOut,
    DashboardCategoryItem,
    DashboardTrendItem,
    DashboardTransactionItem
)
from app.services.recurring_service import process_due_rules

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    auto_process_recurring: bool = Query(True, description="Automatically generate due recurring expenses"),
    db: Session = Depends(get_db)
):
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year

    # Process due recurring rules if enabled
    if auto_process_recurring:
        try:
            process_due_rules(db, today)
        except Exception:
            pass

    # 1. Total expenses in paise
    total_expenses = db.query(func.coalesce(func.sum(Expense.amount_paise), 0)).filter(
        extract("month", Expense.date) == target_month,
        extract("year", Expense.date) == target_year
    ).scalar() or 0

    # 2. Total income in paise
    total_income = db.query(func.coalesce(func.sum(Income.amount_paise), 0)).filter(
        extract("month", Income.date) == target_month,
        extract("year", Income.date) == target_year
    ).scalar() or 0

    # 3. Net balance
    net_balance = total_income - total_expenses

    # 4. Category breakdown for donut chart
    cat_breakdown_query = db.query(
        Category.id,
        Category.name,
        Category.color,
        func.coalesce(func.sum(Expense.amount_paise), 0).label("total")
    ).join(Expense, Expense.category_id == Category.id).filter(
        extract("month", Expense.date) == target_month,
        extract("year", Expense.date) == target_year
    ).group_by(Category.id, Category.name, Category.color).order_by(desc("total")).all()

    category_breakdown: List[DashboardCategoryItem] = []
    for cid, cname, ccolor, ctotal in cat_breakdown_query:
        pct = round((ctotal / total_expenses) * 100, 2) if total_expenses > 0 else 0.0
        category_breakdown.append(
            DashboardCategoryItem(
                category_id=cid,
                category_name=cname,
                category_color=ccolor,
                total_paise=ctotal,
                percentage=pct
            )
        )

    top_category = category_breakdown[0] if category_breakdown else None

    # 5. Spending trend (daily aggregated for target month)
    days_in_month = calendar.monthrange(target_year, target_month)[1]
    daily_spend = dict(
        db.query(
            Expense.date,
            func.coalesce(func.sum(Expense.amount_paise), 0)
        ).filter(
            extract("month", Expense.date) == target_month,
            extract("year", Expense.date) == target_year
        ).group_by(Expense.date).all()
    )

    spending_trend: List[DashboardTrendItem] = []
    # Fill each day of the month up to max day
    max_day = days_in_month
    if target_year == today.year and target_month == today.month:
        max_day = min(days_in_month, today.day)

    for day in range(1, max_day + 1):
        d = date(target_year, target_month, day)
        spending_trend.append(
            DashboardTrendItem(
                date=d.isoformat(),
                total_paise=daily_spend.get(d, 0)
            )
        )

    # 6. Recent transactions (combined expenses & income)
    recent_expenses = db.query(Expense).join(Category).order_by(
        desc(Expense.date), desc(Expense.id)
    ).limit(10).all()

    recent_incomes = db.query(Income).order_by(
        desc(Income.date), desc(Income.id)
    ).limit(10).all()

    recent_items: List[DashboardTransactionItem] = []

    for exp in recent_expenses:
        recent_items.append(
            DashboardTransactionItem(
                id=exp.id,
                type="expense",
                date=exp.date,
                description=exp.description,
                amount_paise=exp.amount_paise,
                category_name=exp.category.name if exp.category else None,
                category_color=exp.category.color if exp.category else None,
                payment_method=exp.payment_method
            )
        )

    for inc in recent_incomes:
        recent_items.append(
            DashboardTransactionItem(
                id=inc.id,
                type="income",
                date=inc.date,
                description=inc.description,
                amount_paise=inc.amount_paise,
                category_name=inc.source,
                category_color="#10B981",  # green for income
                payment_method=inc.payment_method
            )
        )

    # Sort combined recent items by date desc, then slice top 10
    recent_items.sort(key=lambda x: x.date, reverse=True)
    recent_transactions = recent_items[:10]

    return DashboardSummaryOut(
        month=target_month,
        year=target_year,
        total_expenses_paise=total_expenses,
        total_income_paise=total_income,
        net_balance_paise=net_balance,
        top_category=top_category,
        category_breakdown=category_breakdown,
        spending_trend=spending_trend,
        recent_transactions=recent_transactions
    )
