from datetime import date
from typing import List, Tuple
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session
from app.models.recurring_rule import RecurringRule
from app.models.expense import Expense


def advance_date(current_date: date, frequency: str) -> date:
    if frequency == "daily":
        return current_date + relativedelta(days=1)
    elif frequency == "weekly":
        return current_date + relativedelta(weeks=1)
    elif frequency == "monthly":
        return current_date + relativedelta(months=1)
    elif frequency == "yearly":
        return current_date + relativedelta(years=1)
    return current_date + relativedelta(months=1)


def process_due_rules(db: Session, target_date: date = None) -> Tuple[int, List[int]]:
    """
    Idempotently processes all due recurring rules up to target_date (default today),
    generating all missed occurrences in a single transaction and advancing next_due_date.
    """
    if target_date is None:
        target_date = date.today()

    active_rules = db.query(RecurringRule).filter(
        RecurringRule.is_active == True,
        RecurringRule.next_due_date <= target_date
    ).all()

    rules_checked = len(active_rules)
    generated_expense_ids = []

    for rule in active_rules:
        # Generate all missed occurrences up to target_date
        while rule.is_active and rule.next_due_date <= target_date:
            if rule.end_date and rule.next_due_date > rule.end_date:
                rule.is_active = False
                break

            # Check idempotency: does an expense for this rule and this exact date already exist?
            existing_expense = db.query(Expense).filter(
                Expense.recurring_rule_id == rule.id,
                Expense.date == rule.next_due_date
            ).first()

            if not existing_expense:
                new_expense = Expense(
                    category_id=rule.category_id,
                    amount_paise=rule.amount_paise,
                    date=rule.next_due_date,
                    description=rule.description,
                    payment_method=rule.payment_method,
                    notes=f"Auto-generated recurring expense ({rule.frequency})",
                    recurring_rule_id=rule.id,
                )
                db.add(new_expense)
                db.flush()  # get new_expense.id
                generated_expense_ids.append(new_expense.id)

            rule.last_run_date = rule.next_due_date
            rule.next_due_date = advance_date(rule.next_due_date, rule.frequency)

            if rule.end_date and rule.next_due_date > rule.end_date:
                rule.is_active = False
                break

    db.commit()
    return rules_checked, generated_expense_ids
