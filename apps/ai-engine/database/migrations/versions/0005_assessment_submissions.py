"""Canonical adaptive assessment state, receipts and mastery evidence."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0005_assessment_submissions"
down_revision = "0004_class_material_rag"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("quiz_sessions", sa.Column("assessment_state", sa.JSON()))
    op.create_table(
        "assessment_submissions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "quiz_session_id",
            UUID(as_uuid=True),
            sa.ForeignKey("quiz_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "question_id",
            UUID(as_uuid=True),
            sa.ForeignKey("quiz_questions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "quiz_attempt_id",
            UUID(as_uuid=True),
            sa.ForeignKey("quiz_attempts.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("attempt_index", sa.Integer(), nullable=False),
        sa.Column("request_fingerprint", sa.String(64), nullable=False),
        sa.Column("response_payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("quiz_session_id", "attempt_index", name="uq_assessment_attempt_index"),
    )
    op.create_index(
        "ix_assessment_submissions_quiz_session_id", "assessment_submissions", ["quiz_session_id"]
    )
    op.create_index(
        "ix_assessment_submissions_student_id", "assessment_submissions", ["student_id"]
    )
    op.create_table(
        "mastery_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "submission_id",
            UUID(as_uuid=True),
            sa.ForeignKey("assessment_submissions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "concept_id",
            UUID(as_uuid=True),
            sa.ForeignKey("concepts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("mastery_before", sa.Float(), nullable=False),
        sa.Column("mastery_after", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("submission_id", "concept_id", name="uq_mastery_submission_concept"),
    )
    op.create_index("ix_mastery_events_student_id", "mastery_events", ["student_id"])


def downgrade():
    op.drop_table("mastery_events")
    op.drop_table("assessment_submissions")
    op.drop_column("quiz_sessions", "assessment_state")
