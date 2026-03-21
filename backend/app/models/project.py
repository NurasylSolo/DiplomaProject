import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    logo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    accent_color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="projects")
    mentions = relationship("Mention", back_populates="project", cascade="all, delete-orphan")
    sources = relationship("Source", back_populates="project", cascade="all, delete-orphan")
    topics = relationship("Topic", back_populates="project", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="project", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="project", cascade="all, delete-orphan")
    email_schedules = relationship("EmailReportSchedule", back_populates="project", cascade="all, delete-orphan")
    saved_filters = relationship("SavedFilter", back_populates="project", cascade="all, delete-orphan")
    influencers = relationship("Influencer", back_populates="project", cascade="all, delete-orphan")
    chats = relationship("Chat", back_populates="project", cascade="all, delete-orphan")
    raw_documents = relationship("RawDocument", back_populates="project", cascade="all, delete-orphan")
    crawl_jobs = relationship("CrawlJob", back_populates="project", cascade="all, delete-orphan")
    alert_rules = relationship("AlertRule", back_populates="project", cascade="all, delete-orphan")
    notification_events = relationship("NotificationEvent", back_populates="project", cascade="all, delete-orphan")
