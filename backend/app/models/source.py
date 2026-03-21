import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Boolean, Float, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    trust_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(500), nullable=True)
    last_crawled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="sources")
    mentions = relationship("Mention", back_populates="source", cascade="all, delete-orphan")
    fetch_state = relationship("SourceFetchState", back_populates="source", uselist=False, cascade="all, delete-orphan")
    raw_documents = relationship("RawDocument", back_populates="source", cascade="all, delete-orphan")
    crawl_jobs = relationship("CrawlJob", back_populates="source", cascade="all, delete-orphan")
