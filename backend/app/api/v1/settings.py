from typing import Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.settings import AppSetting
from app.schemas.settings import SettingsMap, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=SettingsMap)
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(AppSetting).all()
    res = {r.key: r.value for r in rows}
    # Ensure default currency if not set
    if "currency_symbol" not in res:
        res["currency_symbol"] = "₹"
    if "currency_code" not in res:
        res["currency_code"] = "INR"
    return SettingsMap(settings=res)


@router.put("", response_model=SettingsMap)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    for key, value in payload.settings.items():
        row = db.query(AppSetting).filter(AppSetting.key == key).first()
        if row:
            row.value = str(value)
        else:
            db.add(AppSetting(key=key, value=str(value)))
    db.commit()

    rows = db.query(AppSetting).all()
    res = {r.key: r.value for r in rows}
    return SettingsMap(settings=res)
