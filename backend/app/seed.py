from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.category import Category
from app.models.settings import AppSetting

DEFAULT_CATEGORIES = [
    {"name": "Food", "color": "#EF4444", "icon": "utensils", "is_default": True},
    {"name": "Transport", "color": "#F97316", "icon": "car", "is_default": True},
    {"name": "Rent", "color": "#8B5CF6", "icon": "home", "is_default": True},
    {"name": "Bills", "color": "#EAB308", "icon": "receipt", "is_default": True},
    {"name": "Shopping", "color": "#EC4899", "icon": "shopping-bag", "is_default": True},
    {"name": "Health", "color": "#10B981", "icon": "heart-pulse", "is_default": True},
    {"name": "Entertainment", "color": "#06B6D4", "icon": "film", "is_default": True},
    {"name": "Other", "color": "#64748B", "icon": "tag", "is_default": True},
]

DEFAULT_SETTINGS = {
    "currency_symbol": "₹",
    "currency_code": "INR",
    "default_payment_method": "UPI",
}


def seed_data(db: Session) -> None:
    # Seed default categories
    for cat_data in DEFAULT_CATEGORIES:
        existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
        if not existing:
            cat = Category(**cat_data)
            db.add(cat)
        else:
            # Ensure is_default flag is preserved
            existing.is_default = True

    # Seed default settings
    for key, val in DEFAULT_SETTINGS.items():
        existing_setting = db.query(AppSetting).filter(AppSetting.key == key).first()
        if not existing_setting:
            db.add(AppSetting(key=key, value=val))

    db.commit()


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_data(db)
        print("Successfully seeded default categories and settings.")
    finally:
        db.close()
