from datetime import date
from typing import Optional
from sqlalchemy import Integer, BigInteger, String, Text, Date, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), default="UPI", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recurring_rule_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("recurring_rules.id", ondelete="SET NULL"),
        nullable=True
    )

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="expenses")
    recurring_rule: Mapped[Optional["RecurringRule"]] = relationship(
        "RecurringRule", back_populates="expenses"
    )

    __table_args__ = (
        Index("ix_expenses_date_category", "date", "category_id"),
    )
