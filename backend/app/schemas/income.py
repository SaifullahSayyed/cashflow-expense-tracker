from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class IncomeBase(BaseModel):
    amount_paise: int = Field(..., gt=0, description="Amount in paise (1 INR = 100 paise)")
    date: date
    source: str = Field(default="Salary", min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=255)
    payment_method: str = Field(default="bank", max_length=50)


class IncomeCreate(IncomeBase):
    pass


class IncomeUpdate(BaseModel):
    amount_paise: Optional[int] = Field(None, gt=0)
    date: Optional[date] = None
    source: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    payment_method: Optional[str] = Field(None, max_length=50)


class IncomeOut(IncomeBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
