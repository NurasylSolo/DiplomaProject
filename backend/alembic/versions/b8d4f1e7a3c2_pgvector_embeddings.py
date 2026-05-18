"""pgvector_embeddings

Switch ``mention_embeddings.embedding`` from ``ARRAY(Float)`` to a
pgvector ``vector(1536)`` column and add an HNSW index for cosine
distance so RAG retrieval (chat, insights, reports, topic assignment)
runs inside Postgres via ``<=>`` instead of pulling every row into
Python.

Revision ID: b8d4f1e7a3c2
Revises: 5e8c2f31a7b4
Create Date: 2026-05-18 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "b8d4f1e7a3c2"
down_revision: Union[str, None] = "5e8c2f31a7b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


EMBEDDING_DIM = 1536


def upgrade() -> None:
    # 1. Enable pgvector. Requires superuser privileges on the database
    #    role used by Alembic, or the extension must be pre-installed by
    #    the DBA (`CREATE EXTENSION vector;`).
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 2. Convert the existing column. We cannot cast ARRAY(float) directly
    #    to vector(N), so we go via text. Rows whose array length does not
    #    match the target dimension would fail the cast — they're almost
    #    certainly leftover hash-fallback embeddings (dim=32 or 64), so
    #    drop them first instead of poisoning the migration.
    op.execute(
        f"DELETE FROM mention_embeddings "
        f"WHERE array_length(embedding, 1) IS DISTINCT FROM {EMBEDDING_DIM}"
    )

    op.execute(
        f"ALTER TABLE mention_embeddings "
        f"ALTER COLUMN embedding TYPE vector({EMBEDDING_DIM}) "
        f"USING embedding::text::vector({EMBEDDING_DIM})"
    )

    # 3. HNSW index for cosine distance. HNSW gives sub-linear top-k
    #    retrieval with high recall, which is what we need for RAG.
    #    Note: HNSW requires pgvector >= 0.5.0.
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_mention_embeddings_embedding_hnsw "
        "ON mention_embeddings USING hnsw (embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_mention_embeddings_embedding_hnsw")
    # Revert the column type. The cast through text round-trips fine.
    op.execute(
        "ALTER TABLE mention_embeddings "
        "ALTER COLUMN embedding TYPE double precision[] "
        "USING embedding::text::double precision[]"
    )
    # We intentionally don't DROP EXTENSION vector — other objects could
    # depend on it, and dropping an extension that isn't ours is risky.
