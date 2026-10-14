from typing import Optional
from sqlalchemy import Integer, BigInteger, ForeignKey, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin


class Budget(Base, TimestampMixin):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    category_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    month: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 - 12
    year: Mapped[int] = mapped_column(Integer, nullable=False)   # e.g. 2026
    limit_amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Relationships
    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="budgets")

    __table_args__ = (
        # Unique constraint for category budgets: only one budget per category per month/year
        Index(
            "uq_budget_category_month_year",
            "category_id", "month", "year",
            unique=True,
            sqlite_where=text("category_id IS NOT NULL"),
            postgresql_where=text("category_id IS NOT NULL")
        ),
        # Unique constraint for overall monthly budget (where category_id is NULL)
        Index(
            "uq_budget_overall_month_year",
            "month", "year",
            unique=True,
            sqlite_where=text("category_id IS NULL"),
            postgresql_where=text("category_id IS NULL")
        ),
    )
