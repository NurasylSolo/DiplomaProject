from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ReportConfigSchema(BaseModel):
    sections: List[str] = []
    filters: Optional[Dict[str, Any]] = None
    language: str = "ru"
    logo: Optional[str] = None
    accent_color: Optional[str] = None
    description: Optional[str] = None


class ReportCreateRequest(BaseModel):
    name: str = "Report"
    config: Optional[ReportConfigSchema] = None


class ReportResponse(BaseModel):
    id: str
    project_id: str
    name: str
    type: str
    config: Optional[Dict[str, Any]] = None
    status: str
    file_url: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None

    class Config:
        from_attributes = True


class EmailScheduleCreate(BaseModel):
    recipients: List[str]
    frequency: str = "weekly"
    config: Optional[ReportConfigSchema] = None
    send_time: str = "09:00"
    timezone: str = "Asia/Almaty"
    active: bool = True


class EmailScheduleUpdate(BaseModel):
    recipients: Optional[List[str]] = None
    frequency: Optional[str] = None
    config: Optional[ReportConfigSchema] = None
    send_time: Optional[str] = None
    timezone: Optional[str] = None
    active: Optional[bool] = None


class EmailScheduleResponse(BaseModel):
    id: str
    project_id: str
    recipients: Optional[List[str]] = None
    frequency: str
    config: Optional[Dict[str, Any]] = None
    send_time: str
    timezone: str
    active: bool
    last_sent_at: Optional[str] = None
    next_send_at: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True
