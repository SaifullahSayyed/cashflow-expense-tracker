from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.category import CategoryOut


class ExpenseBase(BaseModel):
    category_id: int
    amount_paise: int = Field(..., gt=0, description="Amount in paise (1 INR = 100 paise)")
    date: date
    description: str = Field(..., min_length=1, max_length=255)
    payment_method: str = Field(default="UPI", max_length=50)
    notes: Optional[str] = Field(None, max_length=1000)


class ExpenseCreate(ExpenseBase):
    recurring_rule_id: Optional[int] = None


class ExpenseUpdate(BaseModel):
    category_id: Optional[int] = None
    amount_paise: Optional[int] = Field(None, gt=0)
    date: Optional[date] = None
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    payment_method: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=1000)


class ExpenseOut(ExpenseBase):
    id: int
    recurring_rule_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryOut] = None

    model_config = ConfigDict(from_attributes=True)
