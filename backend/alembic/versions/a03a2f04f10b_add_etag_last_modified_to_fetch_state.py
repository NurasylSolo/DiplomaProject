"""add_etag_last_modified_to_fetch_state

Revision ID: a03a2f04f10b
Revises: 4d3a2c1b9f7e
Create Date: 2026-03-18 12:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a03a2f04f10b"
down_revision: Union[str, None] = "4d3a2c1b9f7e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("source_fetch_states", sa.Column("etag", sa.String(length=512), nullable=True))
    op.add_column("source_fetch_states", sa.Column("last_modified", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("source_fetch_states", "last_modified")
    op.drop_column("source_fetch_states", "etag")

