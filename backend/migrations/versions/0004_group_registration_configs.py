"""add group_registration_configs table

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "group_registration_configs",
        sa.Column("id",             sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("slug",           sa.String(128),  nullable=False, unique=True),
        sa.Column("title_en",       sa.String(255),  nullable=False),
        sa.Column("title_ar",       sa.String(255),  nullable=True),
        sa.Column("description_en", sa.Text(),        nullable=True),
        sa.Column("description_ar", sa.Text(),        nullable=True),
        sa.Column("is_active",      sa.Boolean(),    nullable=False, server_default="1"),
        sa.Column("created_at",     sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",     sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("group_registration_configs")
