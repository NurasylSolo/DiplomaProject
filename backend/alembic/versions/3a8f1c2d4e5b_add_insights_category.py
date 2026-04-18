"""add_insights_category

Revision ID: 3a8f1c2d4e5b
Revises: 211d2a660bc9
Create Date: 2026-04-19 00:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "3a8f1c2d4e5b"
down_revision: Union[str, None] = "211d2a660bc9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "insights",
        sa.Column("category", sa.String(length=50), server_default="general", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("insights", "category")
