from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class FilterCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    filters: Dict[str, Any]


class FilterUpdate(BaseModel):
    name: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None


class FilterResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    name: str
    filters: Optional[Dict[str, Any]] = None
    created_at: str

    class Config:
        from_attributes = True
