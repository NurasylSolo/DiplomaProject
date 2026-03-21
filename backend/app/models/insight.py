import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Float, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Insight(Base):
    __tablename__ = "insights"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False)
    metric: Mapped[float | None] = mapped_column(Float, nullable=True)
    metric_change: Mapped[float | None] = mapped_column(Float, nullable=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    related_mention_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="insights")
