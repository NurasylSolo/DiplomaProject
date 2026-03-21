import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SourceFetchState(Base):
    __tablename__ = "source_fetch_states"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id: Mapped[str] = mapped_column(String(36), ForeignKey("sources.id"), nullable=False, unique=True, index=True)
    last_fetch_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cursor: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    etag: Mapped[str | None] = mapped_column(String(512), nullable=True)
    last_modified: Mapped[str | None] = mapped_column(String(512), nullable=True)
    last_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    source = relationship("Source", back_populates="fetch_state")
