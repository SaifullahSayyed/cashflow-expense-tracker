from datetime import date
from typing import List, Optional
from sqlalchemy import BigInteger, String, Boolean, Date, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin


class RecurringRule(Base, TimestampMixin):
    __tablename__ = "recurring_rules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), default="UPI", nullable=False)
    frequency: Mapped[str] = mapped_column(String(50), default="monthly", nullable=False)  # daily, weekly, monthly, yearly
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    next_due_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    last_run_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="recurring_rules")
    expenses: Mapped[List["Expense"]] = relationship("Expense", back_populates="recurring_rule")

    __table_args__ = (
        Index("ix_recurring_active_due", "is_active", "next_due_date"),
    )
