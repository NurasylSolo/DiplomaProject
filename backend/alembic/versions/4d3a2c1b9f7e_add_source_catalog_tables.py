"""add_source_catalog_tables

Revision ID: 4d3a2c1b9f7e
Revises: c25d82f0412a
Create Date: 2026-03-18 11:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4d3a2c1b9f7e"
down_revision: Union[str, None] = "c25d82f0412a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "source_catalog",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("domain", sa.String(length=255), nullable=False),
        sa.Column("base_url", sa.String(length=500), nullable=False),
        sa.Column("language", sa.String(length=10), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("source_type", sa.String(length=20), nullable=False),
        sa.Column("trust_score", sa.Float(), nullable=False),
        sa.Column("robots_policy", sa.String(length=50), nullable=True),
        sa.Column("crawl_priority", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_source_catalog_domain"), "source_catalog", ["domain"], unique=True)

    op.create_table(
        "source_catalog_health",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("source_catalog_id", sa.String(length=36), nullable=False),
        sa.Column("uptime_fetch", sa.Float(), nullable=False),
        sa.Column("error_rate", sa.Float(), nullable=False),
        sa.Column("avg_latency", sa.Float(), nullable=False),
        sa.Column("block_rate", sa.Float(), nullable=False),
        sa.Column("total_fetches", sa.Integer(), nullable=False),
        sa.Column("success_fetches", sa.Integer(), nullable=False),
        sa.Column("error_fetches", sa.Integer(), nullable=False),
        sa.Column("blocked_fetches", sa.Integer(), nullable=False),
        sa.Column("consecutive_errors", sa.Integer(), nullable=False),
        sa.Column("last_status_code", sa.Integer(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("auto_disabled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("auto_disabled_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["source_catalog_id"], ["source_catalog.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_catalog_id"),
    )
    op.create_index(
        op.f("ix_source_catalog_health_source_catalog_id"),
        "source_catalog_health",
        ["source_catalog_id"],
        unique=True,
    )

    op.create_table(
        "source_catalog_policy",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("source_catalog_id", sa.String(length=36), nullable=False),
        sa.Column("respect_robots", sa.Boolean(), nullable=False),
        sa.Column("user_agent", sa.String(length=255), nullable=False),
        sa.Column("crawl_delay_ms", sa.Integer(), nullable=False),
        sa.Column("max_requests_per_minute", sa.Integer(), nullable=False),
        sa.Column("max_error_rate", sa.Float(), nullable=False),
        sa.Column("max_block_rate", sa.Float(), nullable=False),
        sa.Column("min_fetches_before_enforce", sa.Integer(), nullable=False),
        sa.Column("disable_on_error_burst", sa.Integer(), nullable=False),
        sa.Column("allow_paths", sa.JSON(), nullable=True),
        sa.Column("deny_paths", sa.JSON(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["source_catalog_id"], ["source_catalog.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_catalog_id"),
    )
    op.create_index(
        op.f("ix_source_catalog_policy_source_catalog_id"),
        "source_catalog_policy",
        ["source_catalog_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_source_catalog_policy_source_catalog_id"), table_name="source_catalog_policy")
    op.drop_table("source_catalog_policy")

    op.drop_index(op.f("ix_source_catalog_health_source_catalog_id"), table_name="source_catalog_health")
    op.drop_table("source_catalog_health")

    op.drop_index(op.f("ix_source_catalog_domain"), table_name="source_catalog")
    op.drop_table("source_catalog")

