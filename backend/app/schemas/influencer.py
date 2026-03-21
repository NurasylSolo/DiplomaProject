from typing import Optional, Dict
from pydantic import BaseModel


class InfluencerResponse(BaseModel):
    id: str
    project_id: str
    handle: str
    platform: str
    display_name: str
    avatar: Optional[str] = None
    followers: int
    avg_engagement: float
    influence_score: float
    mentions_count: int
    reach: int
    share_of_voice: float
    sentiment_distribution: Optional[Dict[str, float]] = None
    last_seen: Optional[str] = None

    class Config:
        from_attributes = True
