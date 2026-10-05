"""Durable guided lessons and idempotent learner actions."""

import sqlalchemy as sa
from alembic import op

revision = "0007_guided_learning"
down_revision = "0006_editorial_quizzes"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("learning_sessions", sa.Column("guided_state", sa.JSON(), nullable=True))
    op.create_table(
        "learning_action_receipts",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "session_id",
            sa.UUID(),
            sa.ForeignKey("learning_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("request_fingerprint", sa.String(64), nullable=False),
        sa.Column("response_payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("session_id", "revision", name="uq_learning_action_revision"),
    )
    op.create_index(
        "ix_learning_action_receipts_session_id", "learning_action_receipts", ["session_id"]
    )


def downgrade():
    op.drop_index("ix_learning_action_receipts_session_id", table_name="learning_action_receipts")
    op.drop_table("learning_action_receipts")
    op.drop_column("learning_sessions", "guided_state")
