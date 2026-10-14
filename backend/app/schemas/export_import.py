from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field


class CsvPreviewRow(BaseModel):
    row_index: int
    date: date
    amount_paise: int
    description: str
    category_name: Optional[str] = None
    category_id: Optional[int] = None
    payment_method: str = "UPI"
    notes: Optional[str] = None
    is_duplicate: bool = False
    duplicate_reason: Optional[str] = None


class CsvPreviewResponse(BaseModel):
    total_rows: int
    probable_duplicates: int
    valid_rows: int
    rows: List[CsvPreviewRow]
    available_categories: List[dict]


class CsvImportRowItem(BaseModel):
    date: date
    amount_paise: int = Field(..., gt=0)
    description: str = Field(..., min_length=1)
    category_id: int
    payment_method: str = "UPI"
    notes: Optional[str] = None
    import_confirmed: bool = True  # Allows overriding flagged duplicates


class CsvImportConfirmRequest(BaseModel):
    rows: List[CsvImportRowItem]


class CsvImportConfirmResponse(BaseModel):
    imported_count: int
    skipped_count: int
    message: str
