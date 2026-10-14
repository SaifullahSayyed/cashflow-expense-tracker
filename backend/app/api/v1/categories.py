from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.category import Category
from app.models.expense import Expense
from app.models.recurring_rule import RecurringRule
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryOut
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    # Fetch categories along with count of expenses
    categories = db.query(Category).all()
    results = []
    for cat in categories:
        count = db.query(func.count(Expense.id)).filter(Expense.category_id == cat.id).scalar() or 0
        cat_out = CategoryOut.model_validate(cat)
        cat_out.expense_count = count
        results.append(cat_out)
    return results


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(Category).filter(func.lower(Category.name) == payload.name.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with name '{payload.name}' already exists"
        )

    category = Category(
        name=payload.name.strip(),
        color=payload.color,
        icon=payload.icon,
        is_default=False
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    cat_out = CategoryOut.model_validate(category)
    cat_out.expense_count = 0
    return cat_out


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    # Protection: protect default categories from renaming
    if category.is_default and payload.name and payload.name.lower() != category.name.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Default category '{category.name}' cannot be renamed"
        )

    if payload.name:
        existing = db.query(Category).filter(
            func.lower(Category.name) == payload.name.lower(),
            Category.id != category_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Another category with name '{payload.name}' already exists"
            )
        category.name = payload.name.strip()

    if payload.color is not None:
        category.color = payload.color

    if payload.icon is not None:
        category.icon = payload.icon

    db.commit()
    db.refresh(category)
    count = db.query(func.count(Expense.id)).filter(Expense.category_id == category.id).scalar() or 0
    cat_out = CategoryOut.model_validate(category)
    cat_out.expense_count = count
    return cat_out


@router.delete("/{category_id}", response_model=MessageResponse)
def delete_category(
    category_id: int,
    reassign_to: Optional[int] = Query(None, description="Category ID to reassign existing expenses to"),
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    # Protection: protect default categories from deletion
    if category.is_default:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Default category '{category.name}' cannot be deleted"
        )

    # Check for linked expenses
    linked_expenses_count = db.query(func.count(Expense.id)).filter(
        Expense.category_id == category_id
    ).scalar() or 0

    if linked_expenses_count > 0:
        if not reassign_to:
            # Fallback to 'Other' default category if not specified
            other_cat = db.query(Category).filter(Category.name == "Other").first()
            if not other_cat or other_cat.id == category_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Category has {linked_expenses_count} linked expenses. Specify 'reassign_to' category ID."
                )
            reassign_to = other_cat.id

        target_cat = db.query(Category).filter(Category.id == reassign_to).first()
        if not target_cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reassign target category not found"
            )

        # Reassign expenses and recurring rules
        db.query(Expense).filter(Expense.category_id == category_id).update(
            {Expense.category_id: reassign_to}, synchronize_session=False
        )
        db.query(RecurringRule).filter(RecurringRule.category_id == category_id).update(
            {RecurringRule.category_id: reassign_to}, synchronize_session=False
        )

    db.delete(category)
    db.commit()
    return MessageResponse(message=f"Category '{category.name}' deleted successfully")
