from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


from sqlalchemy import ARRAY, Float

# The live database stores this column as a plain Postgres ``double precision[]``
# array (the pgvector extension is not enabled here). We therefore use a SQL
# ARRAY type so writes/reads work, and run cosine similarity in Python. If you
# later enable the pgvector extension and migrate the column to ``vector(1536)``,
# swap this for ``pgvector.sqlalchemy.Vector(1536)`` and set
# ``embedding_service.USES_PGVECTOR = True``.
_EMBEDDING_TYPE = ARRAY(Float)


class MentionEmbedding(Base):
    """Persistent OpenAI embeddings for mentions, used for RAG retrieval
    in the Brand Assistant chat, AI Insights, AI Reports and Topic
    auto-discovery / assignment.

    Stored as a pgvector ``vector(1536)`` column so cosine similarity
    runs entirely in Postgres via the ``<=>`` operator with HNSW index
    support — see ``search_similar`` in ``embedding_service``.
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
    embedding: Mapped[list[float]] = mapped_column(_EMBEDDING_TYPE, nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False, default="text-embedding-3-small")
    dim: Mapped[int] = mapped_column(Integer, nullable=False, default=1536)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
