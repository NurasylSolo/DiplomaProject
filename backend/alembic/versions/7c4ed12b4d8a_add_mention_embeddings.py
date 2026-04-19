"""add_mention_embeddings

Revision ID: 7c4ed12b4d8a
Revises: 3a8f1c2d4e5b
Create Date: 2026-04-19 02:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "7c4ed12b4d8a"
down_revision: Union[str, None] = "3a8f1c2d4e5b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mention_embeddings",
        sa.Column("mention_id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("embedding", sa.ARRAY(sa.Float()), nullable=False),
        sa.Column(
            "model",
            sa.String(length=64),
            nullable=False,
            server_default="text-embedding-3-small",
        ),
        sa.Column("dim", sa.Integer(), nullable=False, server_default="1536"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["mention_id"], ["mentions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["project_id"], ["projects.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("mention_id"),
    )
    op.create_index(
        "ix_mention_embeddings_project_id",
        "mention_embeddings",
        ["project_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_mention_embeddings_project_id", table_name="mention_embeddings"
    )
    op.drop_table("mention_embeddings")
