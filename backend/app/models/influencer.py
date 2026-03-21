import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Float, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Influencer(Base):
    __tablename__ = "influencers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    handle: Mapped[str] = mapped_column(String(255), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    followers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_engagement: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    influence_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    mentions_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reach: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    share_of_voice: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    sentiment_distribution: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="influencers")
