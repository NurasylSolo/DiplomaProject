"""add_email_verified_google_oauth_fields

Revision ID: ad301737e32d
Revises: d37ac2f0649a
Create Date: 2026-04-17 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "ad301737e32d"
down_revision: Union[str, None] = "d37ac2f0649a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("auth_provider", sa.String(length=20), server_default="email", nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("google_id", sa.String(length=255), nullable=True),
    )
    op.create_unique_constraint("uq_users_google_id", "users", ["google_id"])
    # Allow Google-only accounts that have no local password.
    op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=False, server_default="")


def downgrade() -> None:
    op.drop_constraint("uq_users_google_id", "users", type_="unique")
    op.drop_column("users", "google_id")
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "email_verified")
    op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=False, server_default=None)
