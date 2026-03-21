"""extend_crawl_jobs_observability

Revision ID: b64d4f715ac2
Revises: 750e9fc7a2a6
Create Date: 2026-03-18 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b64d4f715ac2"
down_revision: Union[str, None] = "750e9fc7a2a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("crawl_jobs", sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("crawl_jobs", sa.Column("max_retries", sa.Integer(), nullable=False, server_default="3"))
    op.add_column("crawl_jobs", sa.Column("queue_latency_ms", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("crawl_jobs", sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("crawl_jobs", sa.Column("worker_id", sa.String(length=100), nullable=True))
    op.add_column("crawl_jobs", sa.Column("idempotency_key", sa.String(length=128), nullable=True))
    op.add_column("crawl_jobs", sa.Column("started_by_scheduler", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.create_index(op.f("ix_crawl_jobs_idempotency_key"), "crawl_jobs", ["idempotency_key"], unique=False)

    op.alter_column("crawl_jobs", "retry_count", server_default=None)
    op.alter_column("crawl_jobs", "max_retries", server_default=None)
    op.alter_column("crawl_jobs", "queue_latency_ms", server_default=None)
    op.alter_column("crawl_jobs", "duration_ms", server_default=None)
    op.alter_column("crawl_jobs", "started_by_scheduler", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_crawl_jobs_idempotency_key"), table_name="crawl_jobs")
    op.drop_column("crawl_jobs", "started_by_scheduler")
    op.drop_column("crawl_jobs", "idempotency_key")
    op.drop_column("crawl_jobs", "worker_id")
    op.drop_column("crawl_jobs", "duration_ms")
    op.drop_column("crawl_jobs", "queue_latency_ms")
    op.drop_column("crawl_jobs", "max_retries")
    op.drop_column("crawl_jobs", "retry_count")

