from typing import Optional, List
from pydantic import BaseModel


class InsightResponse(BaseModel):
    id: str
    project_id: str
    type: str
    title: str
    description: str
    metric: Optional[float] = None
    metric_change: Optional[float] = None
    severity: str
    related_mention_ids: Optional[List[str]] = None
    created_at: str

    class Config:
        from_attributes = True
