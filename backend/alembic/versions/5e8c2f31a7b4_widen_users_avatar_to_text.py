"""widen_users_avatar_to_text

Revision ID: 5e8c2f31a7b4
Revises: 9b3a47e5cd91
Create Date: 2026-04-19 12:00:00.000000

The avatar column was originally `VARCHAR(500)` because we expected to
store URLs. With the in-house upload endpoint we now keep the avatar as
a base64-encoded JPEG dataURL (~30-50 KB), which doesn't fit. Widen the
column to TEXT so dataURLs round-trip without truncation.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "5e8c2f31a7b4"
down_revision: Union[str, None] = "9b3a47e5cd91"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "users",
        "avatar",
        type_=sa.Text(),
        existing_type=sa.String(length=500),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "avatar",
        type_=sa.String(length=500),
        existing_type=sa.Text(),
        existing_nullable=True,
    )
