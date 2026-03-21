import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class RawDocument(Base):
    __tablename__ = "raw_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(String(36), ForeignKey("sources.id"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    final_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    raw_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    normalized_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    url_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    title_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    text_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    simhash: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    cluster_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    cluster_size: Mapped[int] = mapped_column(default=1, nullable=False)
    primary_doc: Mapped[bool] = mapped_column(default=False, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="raw_documents")
    source = relationship("Source", back_populates="raw_documents")
