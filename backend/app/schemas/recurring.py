from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.category import CategoryOut


class RecurringRuleBase(BaseModel):
    category_id: int
    amount_paise: int = Field(..., gt=0, description="Amount in paise")
    description: str = Field(..., min_length=1, max_length=255)
    payment_method: str = Field(default="UPI", max_length=50)
    frequency: str = Field(default="monthly", pattern=r"^(daily|weekly|monthly|yearly)$")
    start_date: date
    end_date: Optional[date] = None


class RecurringRuleCreate(RecurringRuleBase):
    pass


class RecurringRuleUpdate(BaseModel):
    category_id: Optional[int] = None
    amount_paise: Optional[int] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    payment_method: Optional[str] = Field(None, max_length=50)
    frequency: Optional[str] = Field(None, pattern=r"^(daily|weekly|monthly|yearly)$")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class RecurringRuleOut(RecurringRuleBase):
    id: int
    next_due_date: date
    last_run_date: Optional[date] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryOut] = None

    model_config = ConfigDict(from_attributes=True)


class ProcessRecurringResponse(BaseModel):
    rules_checked: int
    entries_generated: int
    generated_expense_ids: List[int]
