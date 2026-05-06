"""add settings JSON to group_registration_configs

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "group_registration_configs",
        sa.Column("settings", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("group_registration_configs", "settings")
