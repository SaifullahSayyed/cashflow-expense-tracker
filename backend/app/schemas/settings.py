from typing import Dict, Any
from pydantic import BaseModel


class SettingsMap(BaseModel):
    settings: Dict[str, str]


class SettingsUpdate(BaseModel):
    settings: Dict[str, str]
