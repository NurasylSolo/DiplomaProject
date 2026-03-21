from pydantic import BaseModel, Field


class SourceCatalogImportItem(BaseModel):
    domain: str | None = None
    base_url: str
    language: str | None = None
    country: str | None = None
    source_type: str = Field(default="rss")
    trust_score: float = Field(default=0.5, ge=0.0, le=1.0)
    robots_policy: str | None = Field(default="unknown")
    crawl_priority: int = Field(default=100, ge=1, le=1000)
    active: bool = True
    tags: list[str] | None = None


class SourceCatalogImportRequest(BaseModel):
    items: list[SourceCatalogImportItem] = Field(default_factory=list)
    csv_payload: str | None = None


class SourceCatalogImportResponse(BaseModel):
    created: int
    updated: int
    skipped: int
    total: int
    errors: list[str] = Field(default_factory=list)


class SourceCatalogHealthResponse(BaseModel):
    domain: str
    base_url: str
    language: str | None = None
    country: str | None = None
    source_type: str
    active: bool
    trust_score: float
    robots_policy: str | None = None
    crawl_priority: int
    tags: list | None = None
    uptime_fetch: float
    error_rate: float
    avg_latency: float
    block_rate: float
    total_fetches: int
    success_fetches: int
    error_fetches: int
    blocked_fetches: int
    consecutive_errors: int
    auto_disabled_at: str | None = None
    auto_disabled_reason: str | None = None
    last_status_code: int | None = None
    last_error: str | None = None
    last_checked_at: str | None = None


class AttachCatalogSourcesRequest(BaseModel):
    languages: list[str] | None = None
    countries: list[str] | None = None
    source_types: list[str] | None = None  # rss/api/html
    tags_any: list[str] | None = None
    min_trust_score: float = Field(default=0.0, ge=0.0, le=1.0)
    active_only: bool = True
    limit: int = Field(default=1000, ge=1, le=5000)
    dry_run: bool = False


class AttachCatalogSourcesResponse(BaseModel):
    matched: int
    created: int
    already_exists: int
    skipped: int
    dry_run: bool
    sample_domains: list[str] = Field(default_factory=list)

