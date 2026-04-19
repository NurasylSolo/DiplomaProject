from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class TopicCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    keywords: Optional[List[str]] = None


class TopicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[List[str]] = None


class TopicResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    parent_topic_id: Optional[str] = None
    sentiment_distribution: Dict = Field(default_factory=dict)
    created_at: str

    class Config:
        from_attributes = True


class TopicSummaryResponse(BaseModel):
    topic_id: str
    summary: str
    mention_ids: List[str] = Field(default_factory=list)
