from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.recurring_rule import RecurringRule
from app.models.category import Category
from app.schemas.recurring import (
    RecurringRuleCreate,
    RecurringRuleUpdate,
    RecurringRuleOut,
    ProcessRecurringResponse
)
from app.schemas.common import MessageResponse
from app.services.recurring_service import process_due_rules

router = APIRouter(prefix="/recurring", tags=["Recurring Rules"])


@router.get("", response_model=List[RecurringRuleOut])
def list_recurring_rules(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(RecurringRule).options(joinedload(RecurringRule.category))
    if is_active is not None:
        query = query.filter(RecurringRule.is_active == is_active)
    rules = query.order_by(RecurringRule.next_due_date.asc()).all()
    return [RecurringRuleOut.model_validate(r) for r in rules]


@router.post("", response_model=RecurringRuleOut, status_code=status.HTTP_201_CREATED)
def create_recurring_rule(payload: RecurringRuleCreate, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == payload.category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category_id")

    rule = RecurringRule(
        category_id=payload.category_id,
        amount_paise=payload.amount_paise,
        description=payload.description.strip(),
        payment_method=payload.payment_method,
        frequency=payload.frequency,
        start_date=payload.start_date,
        end_date=payload.end_date,
        next_due_date=payload.start_date,
        is_active=True
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return RecurringRuleOut.model_validate(rule)


@router.put("/{rule_id}", response_model=RecurringRuleOut)
def update_recurring_rule(
    rule_id: int,
    payload: RecurringRuleUpdate,
    db: Session = Depends(get_db)
):
    rule = db.query(RecurringRule).filter(RecurringRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring rule not found")

    if payload.category_id is not None:
        cat = db.query(Category).filter(Category.id == payload.category_id).first()
        if not cat:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category_id")
        rule.category_id = payload.category_id

    if payload.amount_paise is not None:
        rule.amount_paise = payload.amount_paise
    if payload.description is not None:
        rule.description = payload.description.strip()
    if payload.payment_method is not None:
        rule.payment_method = payload.payment_method
    if payload.frequency is not None:
        rule.frequency = payload.frequency
    if payload.start_date is not None:
        rule.start_date = payload.start_date
    if payload.end_date is not None:
        rule.end_date = payload.end_date
    if payload.is_active is not None:
        rule.is_active = payload.is_active

    db.commit()
    db.refresh(rule)
    return RecurringRuleOut.model_validate(rule)


@router.delete("/{rule_id}", response_model=MessageResponse)
def delete_recurring_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.query(RecurringRule).filter(RecurringRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring rule not found")

    db.delete(rule)
    db.commit()
    return MessageResponse(message="Recurring rule deleted successfully")


@router.post("/process", response_model=ProcessRecurringResponse)
def trigger_process_due_rules(
    target_date: Optional[date] = Query(None, description="Optional target date, defaults to today"),
    db: Session = Depends(get_db)
):
    rules_checked, generated_ids = process_due_rules(db, target_date or date.today())
    return ProcessRecurringResponse(
        rules_checked=rules_checked,
        entries_generated=len(generated_ids),
        generated_expense_ids=generated_ids
    )
