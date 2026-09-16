"""Private classes, membership, text materials and activity trail."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0002_classrooms"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "classrooms",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "teacher_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("subject", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("is_archived", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_classrooms_teacher_id", "classrooms", ["teacher_id"])
    op.create_table(
        "enrollments",
        sa.Column(
            "class_id",
            UUID(as_uuid=True),
            sa.ForeignKey("classrooms.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "student_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "class_materials",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "class_id",
            UUID(as_uuid=True),
            sa.ForeignKey("classrooms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_class_materials_class_id", "class_materials", ["class_id"])
    op.create_table(
        "class_activities",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "class_id",
            UUID(as_uuid=True),
            sa.ForeignKey("classrooms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("target_id", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_class_activities_class_id", "class_activities", ["class_id"])


def downgrade():
    for table in ("class_activities", "class_materials", "enrollments", "classrooms"):
        op.drop_table(table)
