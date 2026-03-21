import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Boolean, JSON, ARRAY, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="reports")


class EmailReportSchedule(Base):
    __tablename__ = "email_report_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    recipients: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True)
    frequency: Mapped[str] = mapped_column(String(20), nullable=False, default="weekly")
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    send_time: Mapped[str] = mapped_column(String(10), nullable=False, default="09:00")
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="Asia/Almaty")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_send_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="email_schedules")
