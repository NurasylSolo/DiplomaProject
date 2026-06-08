"""add crawl_jobs progress counters (total_sources, processed_sources)

These two columns exist in the CrawlJob model and on locally-built databases,
but were never captured in a migration. A freshly-migrated production database
was therefore missing them, which made every project-creation request fail
with: column "total_sources" of relation "crawl_jobs" does not exist.

Uses ``ADD COLUMN IF NOT EXISTS`` so it is safe to apply whether or not the
columns are already present.

Revision ID: a1b2c3d4e5f6
Revises: b8d4f1e7a3c2
Create Date: 2026-06-08 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "b8d4f1e7a3c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE crawl_jobs "
        "ADD COLUMN IF NOT EXISTS total_sources INTEGER NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE crawl_jobs "
        "ADD COLUMN IF NOT EXISTS processed_sources INTEGER NOT NULL DEFAULT 0"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE crawl_jobs DROP COLUMN IF EXISTS processed_sources")
    op.execute("ALTER TABLE crawl_jobs DROP COLUMN IF EXISTS total_sources")
