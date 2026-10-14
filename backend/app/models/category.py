from typing import List, Optional
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#64748B")
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    expenses: Mapped[List["Expense"]] = relationship(
        "Expense", back_populates="category", cascade="all"
    )
    budgets: Mapped[List["Budget"]] = relationship(
        "Budget", back_populates="category", cascade="all, delete-orphan"
    )
    recurring_rules: Mapped[List["RecurringRule"]] = relationship(
        "RecurringRule", back_populates="category", cascade="all"
    )
