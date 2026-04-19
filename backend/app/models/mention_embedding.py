from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Float, Integer, ARRAY, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MentionEmbedding(Base):
    """Persistent OpenAI embeddings for mentions, used for RAG retrieval
    in the Brand Assistant chat, AI Insights, AI Reports and Topic
    auto-discovery / assignment.
    """

    __tablename__ = "mention_embeddings"

    mention_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("mentions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    embedding: Mapped[list[float]] = mapped_column(ARRAY(Float), nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False, default="text-embedding-3-small")
    dim: Mapped[int] = mapped_column(Integer, nullable=False, default=1536)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
