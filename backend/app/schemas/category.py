from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(..., pattern=r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")
    icon: Optional[str] = Field(None, max_length=50)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, pattern=r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")
    icon: Optional[str] = Field(None, max_length=50)


class CategoryOut(CategoryBase):
    id: int
    is_default: bool
    created_at: datetime
    updated_at: datetime
    expense_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
