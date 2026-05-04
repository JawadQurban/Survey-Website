"""add is_intro to questions

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-04 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "questions",
        sa.Column("is_intro", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("questions", "is_intro")
