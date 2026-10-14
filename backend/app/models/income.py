from datetime import date
from sqlalchemy import BigInteger, String, Date, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models.base import TimestampMixin


class Income(Base, TimestampMixin):
    __tablename__ = "income"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(100), default="Salary", nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), default="bank", nullable=False)

    __table_args__ = (
        Index("ix_income_date_source", "date", "source"),
    )
