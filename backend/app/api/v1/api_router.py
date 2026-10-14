from fastapi import APIRouter
from app.api.v1.categories import router as categories_router
from app.api.v1.expenses import router as expenses_router
from app.api.v1.income import router as income_router
from app.api.v1.budgets import router as budgets_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.recurring import router as recurring_router
from app.api.v1.export_import import router as export_import_router
from app.api.v1.settings import router as settings_router

api_v1_router = APIRouter()

api_v1_router.include_router(categories_router)
api_v1_router.include_router(expenses_router)
api_v1_router.include_router(income_router)
api_v1_router.include_router(budgets_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(recurring_router)
api_v1_router.include_router(export_import_router)
api_v1_router.include_router(settings_router)
