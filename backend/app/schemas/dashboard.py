from datetime import date
from typing import List, Optional
from pydantic import BaseModel


class DashboardCategoryItem(BaseModel):
    category_id: int
    category_name: str
    category_color: str
    total_paise: int
    percentage: float


class DashboardTrendItem(BaseModel):
    date: str
    total_paise: int


class DashboardTransactionItem(BaseModel):
    id: int
    type: str  # "expense" or "income"
    date: date
    description: str
    amount_paise: int
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    payment_method: str


class DashboardSummaryOut(BaseModel):
    month: int
    year: int
    total_expenses_paise: int
    total_income_paise: int
    net_balance_paise: int
    top_category: Optional[DashboardCategoryItem] = None
    category_breakdown: List[DashboardCategoryItem]
    spending_trend: List[DashboardTrendItem]
    recent_transactions: List[DashboardTransactionItem]
