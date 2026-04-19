"""add_topic_keywords

Revision ID: 9b3a47e5cd91
Revises: 7c4ed12b4d8a
Create Date: 2026-04-19 02:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "9b3a47e5cd91"
down_revision: Union[str, None] = "7c4ed12b4d8a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "topics",
        sa.Column("keywords", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("topics", "keywords")
