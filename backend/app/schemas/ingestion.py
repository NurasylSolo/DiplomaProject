from pydantic import BaseModel, Field


class IngestionRunRequest(BaseModel):
    limit_sources: int | None = Field(default=None, ge=1, le=200)
    per_source_limit: int = Field(default=30, ge=1, le=200)


class CrawlJobResponse(BaseModel):
    id: str
    project_id: str
    source_id: str | None = None
    status: str
    job_type: str
    started_at: str | None = None
    finished_at: str | None = None
    items_fetched: int
    items_saved: int
    items_deduplicated: int
    total_sources: int = 0
    processed_sources: int = 0
    progress_percent: int = 0
    error: str | None = None
    created_by: str | None = None
    created_at: str
    updated_at: str


class QueueTaskResponse(BaseModel):
    status: str
    job_id: str
    queue_task_id: str
    job_type: str
