from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.category import CategoryOut


class BudgetBase(BaseModel):
    category_id: Optional[int] = Field(None, description="Category ID or None for overall budget")
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    year: int = Field(..., ge=2000, le=2100, description="Year (e.g. 2026)")
    limit_amount_paise: int = Field(..., gt=0, description="Budget cap in paise")


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    limit_amount_paise: int = Field(..., gt=0, description="Budget cap in paise")


class BudgetOut(BudgetBase):
    id: int
    spent_paise: int = 0
    remaining_paise: int = 0
    percentage_used: float = 0.0
    category: Optional[CategoryOut] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
