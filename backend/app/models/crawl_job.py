import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, Text, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CrawlJob(Base):
    __tablename__ = "crawl_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    source_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("sources.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False, default="project_refresh")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    items_fetched: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    items_saved: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    items_deduplicated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    queue_latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    worker_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    started_by_scheduler: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    total_sources: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    processed_sources: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="crawl_jobs")
    source = relationship("Source", back_populates="crawl_jobs")
