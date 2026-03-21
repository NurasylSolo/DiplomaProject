import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Float, Integer, Boolean, Text, JSON, ARRAY, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Mention(Base):
    __tablename__ = "mentions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(String(36), ForeignKey("sources.id"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    snippet: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="ru")
    country: Mapped[str] = mapped_column(String(100), nullable=False, default="KZ")
    sentiment_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    sentiment_label: Mapped[str] = mapped_column(String(20), nullable=False, default="neutral")
    topic_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("topics.id"), nullable=True)
    reach: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    influence_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    visited: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    saved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    emotions: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    entities: Mapped[list | None] = mapped_column(JSON, nullable=True)
    tags: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True)
    cluster_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    cluster_size: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    primary_doc: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    keyword_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    semantic_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    final_relevance_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    project = relationship("Project", back_populates="mentions")
    source = relationship("Source", back_populates="mentions")
    topic = relationship("Topic", back_populates="mentions")
