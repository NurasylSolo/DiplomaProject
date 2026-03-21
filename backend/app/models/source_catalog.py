import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SourceCatalog(Base):
    __tablename__ = "source_catalog"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    domain: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False, default="rss")
    trust_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    robots_policy: Mapped[str | None] = mapped_column(String(50), nullable=True, default="unknown")
    crawl_priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    health = relationship("SourceCatalogHealth", back_populates="catalog", uselist=False, cascade="all, delete-orphan")
    policy = relationship("SourceCatalogPolicy", back_populates="catalog", uselist=False, cascade="all, delete-orphan")


class SourceCatalogHealth(Base):
    __tablename__ = "source_catalog_health"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_catalog_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("source_catalog.id"),
        nullable=False,
        index=True,
        unique=True,
    )
    uptime_fetch: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    error_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    avg_latency: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    block_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_fetches: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    success_fetches: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_fetches: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    blocked_fetches: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    consecutive_errors: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    auto_disabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    auto_disabled_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    catalog = relationship("SourceCatalog", back_populates="health")


class SourceCatalogPolicy(Base):
    __tablename__ = "source_catalog_policy"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_catalog_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("source_catalog.id"),
        nullable=False,
        index=True,
        unique=True,
    )
    respect_robots: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    user_agent: Mapped[str] = mapped_column(String(255), nullable=False, default="SentiNewsBot/1.0")
    crawl_delay_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=1000)
    max_requests_per_minute: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    max_error_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    max_block_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.3)
    min_fetches_before_enforce: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    disable_on_error_burst: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    allow_paths: Mapped[list | None] = mapped_column(JSON, nullable=True)
    deny_paths: Mapped[list | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    catalog = relationship("SourceCatalog", back_populates="policy")

