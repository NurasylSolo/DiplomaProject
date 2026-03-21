from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    logo: Optional[str] = None
    accent_color: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None
    accent_color: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class ProjectStatsResponse(BaseModel):
    total_mentions: int = 0
    total_reach: int = 0
    positive_percentage: float = 0.0
    negative_percentage: float = 0.0
    presence_score: float = 0.0


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    logo: Optional[str] = None
    accent_color: Optional[str] = None
    owner_id: str
    settings: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str
    stats: Optional[ProjectStatsResponse] = None

    class Config:
        from_attributes = True
