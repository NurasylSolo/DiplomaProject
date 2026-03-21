"""add_alert_rules_and_events

Revision ID: c25d82f0412a
Revises: b64d4f715ac2
Create Date: 2026-03-18 10:12:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c25d82f0412a"
down_revision: Union[str, None] = "b64d4f715ac2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "alert_rules",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("rule_type", sa.String(length=50), nullable=False),
        sa.Column("threshold", sa.Float(), nullable=False),
        sa.Column("window_minutes", sa.Integer(), nullable=False),
        sa.Column("channels", sa.JSON(), nullable=True),
        sa.Column("config", sa.JSON(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_alert_rules_project_id"), "alert_rules", ["project_id"], unique=False)
    op.create_index(op.f("ix_alert_rules_rule_type"), "alert_rules", ["rule_type"], unique=False)

    op.create_table(
        "notification_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("rule_id", sa.String(length=36), nullable=True),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("unread", sa.Boolean(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("delivered_channels", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["rule_id"], ["alert_rules.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notification_events_created_at"), "notification_events", ["created_at"], unique=False)
    op.create_index(op.f("ix_notification_events_event_type"), "notification_events", ["event_type"], unique=False)
    op.create_index(op.f("ix_notification_events_project_id"), "notification_events", ["project_id"], unique=False)
    op.create_index(op.f("ix_notification_events_rule_id"), "notification_events", ["rule_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notification_events_rule_id"), table_name="notification_events")
    op.drop_index(op.f("ix_notification_events_project_id"), table_name="notification_events")
    op.drop_index(op.f("ix_notification_events_event_type"), table_name="notification_events")
    op.drop_index(op.f("ix_notification_events_created_at"), table_name="notification_events")
    op.drop_table("notification_events")

    op.drop_index(op.f("ix_alert_rules_rule_type"), table_name="alert_rules")
    op.drop_index(op.f("ix_alert_rules_project_id"), table_name="alert_rules")
    op.drop_table("alert_rules")

