import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Boolean, JSON, Text, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    rule_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    threshold: Mapped[float] = mapped_column(nullable=False, default=0.0)
    window_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    channels: Mapped[list | None] = mapped_column(JSON, nullable=True)
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="alert_rules")
    events = relationship("NotificationEvent", back_populates="rule", cascade="all, delete-orphan")


class NotificationEvent(Base):
    __tablename__ = "notification_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    rule_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("alert_rules.id"), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    unread: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    delivered_channels: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    project = relationship("Project", back_populates="notification_events")
    rule = relationship("AlertRule", back_populates="events")

