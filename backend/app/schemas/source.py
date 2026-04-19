from typing import List, Optional
from pydantic import BaseModel, Field


class SourceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str
    base_url: str
    active: bool = True
    trust_score: float = 0.5
    country: Optional[str] = None
    language: Optional[str] = None
    icon: Optional[str] = None


class SourceBulkActionRequest(BaseModel):
    action: str = Field(..., description="activate | deactivate | delete | mark_trusted | unmark_trusted")
    source_ids: List[str] = Field(default_factory=list)


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    base_url: Optional[str] = None
    active: Optional[bool] = None
    trust_score: Optional[float] = None
    country: Optional[str] = None
    language: Optional[str] = None
    icon: Optional[str] = None


class SourceResponse(BaseModel):
    id: str
    project_id: str
    name: str
    type: str
    base_url: str
    active: bool
    trust_score: float
    country: Optional[str] = None
    language: Optional[str] = None
    icon: Optional[str] = None
    last_crawled_at: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True
