# CashFlow — Personal Expense Tracker Web App

A full-stack, responsive personal expense tracker designed to help you track spending, categorize transactions, set monthly budgets, log recurring rules, and view real-time financial insights.

Built with **FastAPI**, **SQLAlchemy 2.0**, **SQLite** (swap-ready for PostgreSQL), and **React 18** with **TypeScript**, **Tailwind CSS**, and **Recharts**.

---

## 🌟 Features

1. **Dashboard & Analytics**
   - Monthly summary KPIs: Total Spent, Total Income, Net Balance, and Top Category.
   - Interactive Spending by Category donut chart with color-coded legend.
   - Daily spending trend line chart.
   - Recent transactions feed with real-time status.

2. **Expense Tracking**
   - Full CRUD operations with description, amount, date, category, payment method (UPI, Card, Cash, Other), and optional notes.
   - Multi-filter bar: search by keyword, filter by date range, filter by category chips, and filter by payment method.
   - Sortable columns (Date, Amount) with pagination.

3. **Income Logging & Net Balance**
   - Log income entries (Salary, Freelance, Business, Investment, Gift, Rental, Other).
   - Real-time calculation of net balance (Income − Expenses).

4. **Budgets & Spending Limits**
   - Monthly budgets per category as well as overall total budget.
   - Visual progress bars with automated alerts:
     - 🟢 Normal (<80%)
     - 🟡 Warning (≥80%)
     - 🔴 Over-budget (≥100%)
   - Unique constraints on `(category_id, month, year)` with clean 400 error handling for duplicates.

5. **Recurring Rules Automation**
   - Define daily, weekly, monthly, or yearly recurring rules (rent, subscriptions, utilities).
   - Idempotent execution that generates all missed occurrences in a single transaction.
   - Drift-prevention algorithm for end-of-month dates (e.g., 31st lands on 28th Feb without drifting future months).
   - Pause / resume active rules anytime.

6. **CSV Import & Export**
   - Export filtered transactions to standard CSV.
   - Import CSV with automatic duplicate detection (flags duplicates in preview, but allows "import anyway" selection per row).
   - Category mapping during CSV preview.

7. **Currency & Localization**
   - Default currency: INR (`₹`).
   - Configurable currency symbol and code via Settings (USD `$`, EUR `€`, GBP `£`, JPY `¥`, etc.).

8. **Modern UI & Accessibility**
   - Mobile-first, fully responsive design with desktop sidebar and mobile slide-out drawer.
   - Light and Dark mode with instant toggle and local storage persistence.
   - Keyboard-friendly: `Ctrl+K` (or `Cmd+K`) opens Quick Add modal from anywhere; `Esc` closes any active modal; `Enter` submits forms.
   - Floating Quick Add action button always reachable on mobile and desktop.

---

## 🏗️ Architecture & Monetary Design

- **Paise Precision**: All monetary values are strictly stored as integers in paise (1 INR = 100 paise) using `BigInteger`. No floating-point rounding errors exist anywhere in the backend or calculation pipelines.
- **SQLAlchemy 2.0 & SQLite / PostgreSQL**:
  - Structured using modern SQLAlchemy 2.0 mapped columns and typing.
  - Partial unique indexes handle SQLite's NULL uniqueness limitation (`sqlite_where` and `postgresql_where`), allowing seamless transition to PostgreSQL.
- **Alembic Migrations**: Fully version-controlled schema migrations under `backend/alembic`.

---

## 🚀 Quick Start & Setup

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run database migrations**:
   ```bash
   alembic upgrade head
   ```

5. **Seed demo mock data** (optional, populates 90 days of realistic expenses, income, budgets & recurring rules):
   ```bash
   python -m app.demo_seed
   ```

6. **Start the FastAPI server**:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   API interactive docs will be available at: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be running at: [http://localhost:5173/](http://localhost:5173/)

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🧪 Testing

### Backend Tests (pytest)
Runs 18 comprehensive tests covering CRUD operations, filtering, pagination, and all specified edge cases:
- Drift-free recurring schedules for short months.
- Idempotent recurring generation.
- Budget uniqueness returning clean 4xx errors instead of 500s.
- Zero and negative amount validation.
- Decimal string amount parsing in CSV import.
- Category deletion with expense reassignment.

```bash
cd backend
.\.venv\Scripts\pytest -v
```

### Frontend Tests (Vitest)
Unit tests for currency formatting, paise conversions, and date helpers:
```bash
cd frontend
npm run test
```

---

## 📁 Project Structure

```
├── backend/
│   ├── alembic/              # Database migration scripts
│   ├── app/
│   │   ├── api/v1/           # REST API endpoints (expenses, income, budgets, categories, recurring, dashboard, export_import, settings)
│   │   ├── models/           # SQLAlchemy 2.0 ORM models (Expense, Income, Budget, Category, RecurringRule, AppSetting)
│   │   ├── schemas/          # Pydantic v2 validation models
│   │   ├── services/         # Business logic (recurring_service, csv_service)
│   │   ├── database.py       # Engine and session configuration
│   │   ├── seed.py           # Default categories and settings seeder
│   │   ├── demo_seed.py      # Rich 90-day mock dataset seeder
│   │   └── main.py           # FastAPI application entry point
│   ├── tests/                # Complete pytest suite
│   ├── requirements.txt      # Pinned Python dependencies
│   └── pytest.ini            # Pytest configuration
│
├── frontend/
│   ├── src/
│   │   ├── api/              # API client and TypeScript endpoint definitions
│   │   ├── components/
│   │   │   ├── common/       # Button, Input, Modal, ProgressBar, Badge, EmptyState, SkeletonLoader
│   │   │   ├── layout/       # Navbar, Sidebar, AppLayout, QuickAddFab
│   │   │   ├── dashboard/    # KPI StatCards, Recharts Donut & Line charts
│   │   │   ├── expenses/     # ExpenseTable, ExpenseFormModal
│   │   │   ├── income/       # IncomeFormModal
│   │   │   ├── categories/   # CategoryFormModal
│   │   │   └── import/       # CsvImportPanel (drag-and-drop, duplicate resolution)
│   │   ├── context/          # ThemeContext (dark/light), SettingsContext, ToastContext
│   │   ├── pages/            # DashboardPage, ExpensesPage, IncomePage, BudgetsPage, RecurringPage, CategoriesPage, SettingsPage
│   │   ├── utils/            # currency.ts, date.ts
│   │   └── test/             # Vitest tests
│   ├── package.json          # Pinned frontend dependencies
│   ├── tailwind.config.js    # Tailwind configuration with dark mode support
│   └── vite.config.ts        # Vite configuration with API proxy and Vitest
└── README.md
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` / `Cmd + K` | Open Quick Add Expense Modal |
| `Escape` | Close any open modal dialog |
| `Enter` | Submit active form |

---

## 📜 License
MIT
