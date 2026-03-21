from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class TimeSeriesDataSchema(BaseModel):
    date: str
    mentions: int
    reach: int
    positive: Optional[int] = None
    neutral: Optional[int] = None
    negative: Optional[int] = None


class CategoryDataSchema(BaseModel):
    category: str
    mentions: int
    reach: int
    percentage: float


class GeoDataSchema(BaseModel):
    country: str
    country_code: str
    mentions: int
    reach: int
    sentiment: Dict[str, int]


class HotHoursDataSchema(BaseModel):
    day: int
    hour: int
    mentions: int


class TopicResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    parent_topic_id: Optional[str] = None
    mentions_count: int = 0
    reach: int = 0
    share_of_voice: float = 0.0
    sentiment_distribution: Optional[Dict[str, float]] = None
    trend: Optional[List[int]] = None
    created_at: str

    class Config:
        from_attributes = True


class ComparisonItemSchema(BaseModel):
    id: str
    name: str
    date_range: Optional[Dict[str, str]] = None


class ComparisonMetricSchema(BaseModel):
    name: str
    values: List[Dict[str, Any]]


class ComparisonResultSchema(BaseModel):
    type: str
    items: List[ComparisonItemSchema]
    metrics: List[ComparisonMetricSchema]


class ComparisonRequest(BaseModel):
    type: str = "projects"
    item_ids: List[str] = []
    date_from: Optional[str] = None
    date_to: Optional[str] = None


class ChatMessageSchema(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    chat_id: Optional[str] = None


class ChatResponse(BaseModel):
    id: str
    chat_id: str
    role: str
    content: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None


class SummarizeRequest(BaseModel):
    mention_ids: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
