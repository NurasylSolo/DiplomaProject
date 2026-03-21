from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class EntitySchema(BaseModel):
    id: str
    type: str
    value: str
    start_pos: int
    end_pos: int
    confidence: float


class EmotionDataSchema(BaseModel):
    joy: float = 0.0
    anger: float = 0.0
    sadness: float = 0.0
    surprise: float = 0.0
    fear: float = 0.0


class SourceBrief(BaseModel):
    id: str
    name: str
    type: str
    base_url: str
    icon: Optional[str] = None

    class Config:
        from_attributes = True


class MentionResponse(BaseModel):
    id: str
    project_id: str
    source_id: str
    url: str
    title: str
    body: str
    snippet: str
    published_at: str
    ingested_at: str
    language: str
    country: str
    sentiment_score: float
    sentiment_label: str
    topic: Optional[str] = None
    topic_id: Optional[str] = None
    reach: int
    influence_score: float
    visited: bool
    saved: bool
    summary: Optional[str] = None
    emotions: Optional[EmotionDataSchema] = None
    entities: Optional[List[EntitySchema]] = None
    tags: Optional[List[str]] = None
    source: Optional[SourceBrief] = None

    class Config:
        from_attributes = True


class MentionFiltersQuery(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    sources: Optional[str] = None
    sentiment: Optional[str] = None
    topic: Optional[str] = None
    languages: Optional[str] = None
    countries: Optional[str] = None
    influence_min: Optional[float] = None
    influence_max: Optional[float] = None
    visited: Optional[bool] = None
    saved: Optional[bool] = None
    search: Optional[str] = None
    importance: Optional[str] = None


class BulkActionRequest(BaseModel):
    action: str
    mention_ids: List[str]
    value: Optional[Any] = None
