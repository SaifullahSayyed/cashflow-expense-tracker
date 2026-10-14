"""
Demo seed script — adds 90 days of realistic mock data.
Run: backend/.venv/Scripts/python.exe backend/app/demo_seed.py

Safe to re-run: it checks for existing data before inserting.
"""

import random
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Category, AppSetting
from app.models.expense import Expense
from app.models.income import Income
from app.models.budget import Budget
from app.models.recurring_rule import RecurringRule


# ─── helpers ───────────────────────────────────────────────────────────────

def rp(rupees: float) -> int:
    """Convert rupees (float) to paise (int)."""
    return int(Decimal(str(rupees)) * 100)


def rand_date(days_ago_min: int, days_ago_max: int) -> date:
    today = date.today()
    return today - timedelta(days=random.randint(days_ago_min, days_ago_max))


# ─── default categories & settings ─────────────────────────────────────────

DEFAULT_CATEGORIES = [
    {"name": "Food",          "color": "#EF4444", "icon": "utensils",      "is_default": True},
    {"name": "Transport",     "color": "#F97316", "icon": "car",           "is_default": True},
    {"name": "Rent",          "color": "#8B5CF6", "icon": "home",          "is_default": True},
    {"name": "Bills",         "color": "#EAB308", "icon": "receipt",       "is_default": True},
    {"name": "Shopping",      "color": "#EC4899", "icon": "shopping-bag",  "is_default": True},
    {"name": "Health",        "color": "#10B981", "icon": "heart-pulse",   "is_default": True},
    {"name": "Entertainment", "color": "#06B6D4", "icon": "film",          "is_default": True},
    {"name": "Other",         "color": "#64748B", "icon": "tag",           "is_default": True},
]

DEFAULT_SETTINGS = {
    "currency_symbol": "₹",
    "currency_code": "INR",
    "default_payment_method": "UPI",
}


def seed_defaults(db: Session) -> dict[str, Category]:
    for cat_data in DEFAULT_CATEGORIES:
        existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
        if not existing:
            db.add(Category(**cat_data))
        else:
            existing.is_default = True

    for key, val in DEFAULT_SETTINGS.items():
        if not db.query(AppSetting).filter(AppSetting.key == key).first():
            db.add(AppSetting(key=key, value=val))

    db.flush()
    cats = {c.name: c for c in db.query(Category).all()}
    return cats


# ─── mock expenses (90 days) ────────────────────────────────────────────────

def seed_expenses(db: Session, cats: dict[str, Category]) -> None:
    if db.query(Expense).count() > 0:
        print("  Expenses already exist — skipping expense seed.")
        return

    today = date.today()
    PAYMENT_METHODS = ["UPI", "card", "cash", "other"]

    expense_templates: list[dict] = [
        # Food — frequent, small-to-mid
        {"desc": "Swiggy Biryani",         "cat": "Food",          "min": 180, "max": 340,  "freq": 8,  "method": "UPI"},
        {"desc": "Zomato lunch",           "cat": "Food",          "min": 120, "max": 280,  "freq": 10, "method": "UPI"},
        {"desc": "Grocery run — BigBazaar","cat": "Food",          "min": 800, "max": 2400, "freq": 4,  "method": "card"},
        {"desc": "Tea & snacks",           "cat": "Food",          "min": 30,  "max": 80,   "freq": 20, "method": "cash"},
        {"desc": "Restaurant dinner",      "cat": "Food",          "min": 400, "max": 1200, "freq": 5,  "method": "card"},
        {"desc": "Chai & breakfast",       "cat": "Food",          "min": 60,  "max": 150,  "freq": 15, "method": "cash"},
        {"desc": "Blinkit groceries",      "cat": "Food",          "min": 300, "max": 900,  "freq": 5,  "method": "UPI"},
        # Transport
        {"desc": "Uber ride",              "cat": "Transport",     "min": 80,  "max": 350,  "freq": 7,  "method": "UPI"},
        {"desc": "Ola ride",               "cat": "Transport",     "min": 60,  "max": 280,  "freq": 5,  "method": "UPI"},
        {"desc": "Metro card recharge",    "cat": "Transport",     "min": 200, "max": 500,  "freq": 2,  "method": "UPI"},
        {"desc": "Petrol",                 "cat": "Transport",     "min": 800, "max": 2000, "freq": 3,  "method": "card"},
        {"desc": "Auto rickshaw",          "cat": "Transport",     "min": 40,  "max": 120,  "freq": 6,  "method": "cash"},
        # Rent (once a month)
        {"desc": "House rent — October",   "cat": "Rent",          "min": 18000, "max": 18000, "freq": 1, "method": "UPI"},
        {"desc": "House rent — September", "cat": "Rent",          "min": 18000, "max": 18000, "freq": 1, "method": "UPI"},
        {"desc": "House rent — August",    "cat": "Rent",          "min": 18000, "max": 18000, "freq": 1, "method": "UPI"},
        # Bills
        {"desc": "Electricity bill",       "cat": "Bills",         "min": 800,  "max": 1600, "freq": 1, "method": "UPI"},
        {"desc": "WiFi bill — ACT",        "cat": "Bills",         "min": 699,  "max": 699,  "freq": 1, "method": "UPI"},
        {"desc": "Mobile recharge",        "cat": "Bills",         "min": 239,  "max": 299,  "freq": 2, "method": "UPI"},
        {"desc": "Piped gas bill",         "cat": "Bills",         "min": 300,  "max": 600,  "freq": 1, "method": "UPI"},
        # Shopping
        {"desc": "Amazon order",           "cat": "Shopping",      "min": 299,  "max": 3500, "freq": 4, "method": "card"},
        {"desc": "Flipkart purchase",      "cat": "Shopping",      "min": 399,  "max": 2800, "freq": 3, "method": "card"},
        {"desc": "Clothes — H&M",          "cat": "Shopping",      "min": 800,  "max": 3000, "freq": 2, "method": "card"},
        {"desc": "Pharmacy",               "cat": "Health",        "min": 80,   "max": 600,  "freq": 4, "method": "UPI"},
        # Health
        {"desc": "Gym membership",         "cat": "Health",        "min": 1200, "max": 1200, "freq": 1, "method": "UPI"},
        {"desc": "Doctor consultation",    "cat": "Health",        "min": 300,  "max": 800,  "freq": 1, "method": "UPI"},
        {"desc": "Lab tests",              "cat": "Health",        "min": 400,  "max": 1500, "freq": 1, "method": "card"},
        # Entertainment
        {"desc": "Netflix subscription",   "cat": "Entertainment", "min": 649,  "max": 649,  "freq": 1, "method": "card"},
        {"desc": "Spotify Premium",        "cat": "Entertainment", "min": 119,  "max": 119,  "freq": 1, "method": "card"},
        {"desc": "Movie tickets — PVR",    "cat": "Entertainment", "min": 300,  "max": 700,  "freq": 3, "method": "card"},
        {"desc": "Video game purchase",    "cat": "Entertainment", "min": 500,  "max": 2000, "freq": 2, "method": "card"},
        # Other
        {"desc": "Stationery",             "cat": "Other",         "min": 50,  "max": 400,  "freq": 2, "method": "cash"},
        {"desc": "Haircut",                "cat": "Other",         "min": 150, "max": 350,  "freq": 2, "method": "cash"},
        {"desc": "Book purchase",          "cat": "Other",         "min": 200, "max": 700,  "freq": 3, "method": "UPI"},
    ]

    notes_pool = [
        None, None, None,  # most entries have no notes
        "Split with roommate",
        "Reimbursable",
        "Work related",
        "Birthday celebration",
        "Emergency purchase",
    ]

    records: list[Expense] = []
    for tmpl in expense_templates:
        cat = cats.get(tmpl["cat"])
        if not cat:
            continue
        count = tmpl["freq"]
        for _ in range(count):
            days_ago = random.randint(0, 89)
            expense_date = today - timedelta(days=days_ago)
            amount = random.randint(
                rp(tmpl["min"]) // 100,
                rp(tmpl["max"]) // 100,
            )
            records.append(Expense(
                category_id=cat.id,
                amount_paise=rp(amount),
                date=expense_date,
                description=tmpl["desc"],
                payment_method=tmpl.get("method", random.choice(PAYMENT_METHODS)),
                notes=random.choice(notes_pool),
            ))

    random.shuffle(records)
    db.add_all(records)
    print(f"  Added {len(records)} mock expenses.")


# ─── mock income (3 months) ─────────────────────────────────────────────────

def seed_income(db: Session) -> None:
    if db.query(Income).count() > 0:
        print("  Income already exists — skipping income seed.")
        return

    today = date.today()
    month = today.replace(day=1)

    income_records: list[Income] = []
    for i in range(3):
        salary_month = (month - timedelta(days=30 * i)).replace(day=1)
        income_records.append(Income(
            amount_paise=rp(75000),
            date=salary_month.replace(day=1),
            source="Salary",
            description=f"Monthly salary — {salary_month.strftime('%B %Y')}",
            payment_method="bank",
        ))

    # Freelance projects
    income_records += [
        Income(amount_paise=rp(15000), date=today - timedelta(days=45),
               source="Freelance", description="Logo design — StartupXYZ", payment_method="UPI"),
        Income(amount_paise=rp(22500), date=today - timedelta(days=20),
               source="Freelance", description="Website redesign — SmallBiz", payment_method="bank"),
        Income(amount_paise=rp(5000), date=today - timedelta(days=10),
               source="Investment", description="Mutual fund dividend", payment_method="bank"),
        Income(amount_paise=rp(3000), date=today - timedelta(days=60),
               source="Gift", description="Birthday money", payment_method="cash"),
    ]

    db.add_all(income_records)
    print(f"  Added {len(income_records)} mock income entries.")


# ─── mock budgets (current month) ───────────────────────────────────────────

def seed_budgets(db: Session) -> None:
    if db.query(Budget).count() > 0:
        print("  Budgets already exist — skipping budget seed.")
        return

    today = date.today()
    month, year = today.month, today.year

    cats = {c.name: c for c in db.query(Category).all()}

    budgets_data = [
        {"cat": None,           "amount": 80000},   # overall
        {"cat": "Food",         "amount": 12000},
        {"cat": "Transport",    "amount": 4000},
        {"cat": "Rent",         "amount": 18000},
        {"cat": "Bills",        "amount": 3000},
        {"cat": "Shopping",     "amount": 6000},
        {"cat": "Health",       "amount": 3000},
        {"cat": "Entertainment","amount": 2500},
        {"cat": "Other",        "amount": 2000},
    ]

    for b in budgets_data:
        cat_id = cats[b["cat"]].id if b["cat"] else None
        db.add(Budget(
            category_id=cat_id,
            limit_amount_paise=rp(b["amount"]),
            month=month,
            year=year,
        ))

    print(f"  Added {len(budgets_data)} budget entries for {today.strftime('%B %Y')}.")


# ─── mock recurring rules ────────────────────────────────────────────────────

def seed_recurring(db: Session, cats: dict[str, Category]) -> None:
    if db.query(RecurringRule).count() > 0:
        print("  Recurring rules already exist — skipping.")
        return

    today = date.today()

    rules = [
        RecurringRule(
            amount_paise=rp(18000),
            category_id=cats["Rent"].id,
            frequency="monthly",
            start_date=date(today.year, 1, 1),
            next_due_date=today.replace(day=1),
            payment_method="UPI",
            description="Monthly house rent",
            is_active=True,
        ),
        RecurringRule(
            amount_paise=rp(649),
            category_id=cats["Entertainment"].id,
            frequency="monthly",
            start_date=date(today.year, today.month, 5),
            next_due_date=today.replace(day=5) if today.day <= 5 else (today + timedelta(days=30)).replace(day=5),
            payment_method="card",
            description="Netflix Premium subscription",
            is_active=True,
        ),
        RecurringRule(
            amount_paise=rp(1200),
            category_id=cats["Health"].id,
            frequency="monthly",
            start_date=date(today.year, 1, 10),
            next_due_date=today.replace(day=10) if today.day <= 10 else (today + timedelta(days=30)).replace(day=10),
            payment_method="UPI",
            description="Monthly gym membership",
            is_active=True,
        ),
        RecurringRule(
            amount_paise=rp(119),
            category_id=cats["Entertainment"].id,
            frequency="monthly",
            start_date=date(today.year, 1, 15),
            next_due_date=today.replace(day=15) if today.day <= 15 else (today + timedelta(days=30)).replace(day=15),
            payment_method="card",
            description="Spotify subscription",
            is_active=True,
        ),
        RecurringRule(
            amount_paise=rp(1500),
            category_id=cats["Food"].id,
            frequency="weekly",
            start_date=today - timedelta(days=today.weekday()),
            next_due_date=today - timedelta(days=today.weekday()) + timedelta(days=7),
            payment_method="card",
            description="Weekly grocery run",
            is_active=True,
        ),
    ]

    db.add_all(rules)
    print(f"  Added {len(rules)} recurring rules.")


# ─── entry point ─────────────────────────────────────────────────────────────

def run_demo_seed() -> None:
    db: Session = SessionLocal()
    try:
        print("[seed] Running demo seed...")
        cats = seed_defaults(db)
        db.flush()
        cats = {c.name: c for c in db.query(Category).all()}

        seed_expenses(db, cats)
        seed_income(db)
        seed_budgets(db)
        seed_recurring(db, cats)

        db.commit()
        print("[seed] Done! Refresh the app to see your mock data.")
    except Exception as exc:
        db.rollback()
        print(f"[seed] FAILED: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_demo_seed()
