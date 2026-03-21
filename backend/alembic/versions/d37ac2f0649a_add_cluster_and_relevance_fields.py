"""add_cluster_and_relevance_fields

Revision ID: d37ac2f0649a
Revises: a03a2f04f10b
Create Date: 2026-03-18 12:35:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d37ac2f0649a"
down_revision: Union[str, None] = "a03a2f04f10b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("raw_documents", sa.Column("simhash", sa.String(length=16), nullable=True))
    op.add_column("raw_documents", sa.Column("cluster_id", sa.String(length=64), nullable=True))
    op.add_column("raw_documents", sa.Column("cluster_size", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("raw_documents", sa.Column("primary_doc", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.create_index(op.f("ix_raw_documents_simhash"), "raw_documents", ["simhash"], unique=False)
    op.create_index(op.f("ix_raw_documents_cluster_id"), "raw_documents", ["cluster_id"], unique=False)

    op.add_column("mentions", sa.Column("cluster_id", sa.String(length=64), nullable=True))
    op.add_column("mentions", sa.Column("cluster_size", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("mentions", sa.Column("primary_doc", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("mentions", sa.Column("keyword_score", sa.Float(), nullable=False, server_default="0"))
    op.add_column("mentions", sa.Column("semantic_score", sa.Float(), nullable=False, server_default="0"))
    op.add_column("mentions", sa.Column("final_relevance_score", sa.Float(), nullable=False, server_default="0"))
    op.create_index(op.f("ix_mentions_cluster_id"), "mentions", ["cluster_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_mentions_cluster_id"), table_name="mentions")
    op.drop_column("mentions", "final_relevance_score")
    op.drop_column("mentions", "semantic_score")
    op.drop_column("mentions", "keyword_score")
    op.drop_column("mentions", "primary_doc")
    op.drop_column("mentions", "cluster_size")
    op.drop_column("mentions", "cluster_id")

    op.drop_index(op.f("ix_raw_documents_cluster_id"), table_name="raw_documents")
    op.drop_index(op.f("ix_raw_documents_simhash"), table_name="raw_documents")
    op.drop_column("raw_documents", "primary_doc")
    op.drop_column("raw_documents", "cluster_size")
    op.drop_column("raw_documents", "cluster_id")
    op.drop_column("raw_documents", "simhash")

