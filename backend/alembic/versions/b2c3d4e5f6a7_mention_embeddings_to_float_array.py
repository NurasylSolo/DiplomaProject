"""make mention_embeddings.embedding a plain float array (for RAG without pgvector deps)

The ORM model uses ``ARRAY(Float)`` and similarity search runs in Python
(``embedding_service.USES_PGVECTOR = False``). On environments where the
earlier ``pgvector_embeddings`` migration ran (e.g. Render, which has the
pgvector extension), the column became ``vector(1536)`` with an HNSW index —
which then mismatches the model, so embeddings can't be written and the AI
assistant (RAG) has nothing to retrieve.

This migration makes the column a plain ``double precision[]`` everywhere so
storage + Python cosine search work consistently. The mention_embeddings
table is regenerated on ingestion, so dropping/recreating the column is safe
(and avoids fragile vector->array casts).

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-08 00:30:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the pgvector HNSW index if it exists (no-op where it doesn't).
    op.execute("DROP INDEX IF EXISTS ix_mention_embeddings_embedding_hnsw")
    # Recreate the column as a plain float array. Embeddings are recomputed
    # during ingestion, so no data needs preserving.
    op.execute("ALTER TABLE mention_embeddings DROP COLUMN IF EXISTS embedding")
    op.execute(
        "ALTER TABLE mention_embeddings "
        "ADD COLUMN embedding double precision[] NOT NULL DEFAULT '{}'::double precision[]"
    )
    op.execute("ALTER TABLE mention_embeddings ALTER COLUMN embedding DROP DEFAULT")


def downgrade() -> None:
    # No-op: the column stays a float array. (We don't recreate the pgvector
    # column on downgrade to keep this environment-independent.)
    pass
