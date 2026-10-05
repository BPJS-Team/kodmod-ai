"""Reviewed versioned material concepts and immutable formal mastery evidence."""

import sqlalchemy as sa
from alembic import op

revision = "0009_material_concepts"
down_revision = "0008_audit_events"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("classrooms", sa.Column("subject_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_classroom_subject",
        "classrooms",
        "subjects",
        ["subject_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_classrooms_subject_id", "classrooms", ["subject_id"])
    for name in ("mapping_version", "indexed_mapping_version"):
        op.add_column(
            "class_materials", sa.Column(name, sa.Integer(), nullable=False, server_default="0")
        )
    op.add_column(
        "concepts", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true())
    )
    op.add_column(
        "curriculum_chunks",
        sa.Column("material_mapping_version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("mastery_events", sa.Column("source_snapshot", sa.JSON(), nullable=True))
    op.create_table(
        "material_concepts",
        sa.Column(
            "material_id",
            sa.UUID(),
            sa.ForeignKey("class_materials.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("mapping_version", sa.Integer(), primary_key=True),
        sa.Column(
            "concept_id",
            sa.UUID(),
            sa.ForeignKey("concepts.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("content_version", sa.Integer(), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.Column(
            "approved_by", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "mapping_version >= 1 AND content_version >= 1", name="ck_material_concept_versions"
        ),
    )
    op.create_index(
        "uq_material_primary_concept",
        "material_concepts",
        ["material_id", "mapping_version"],
        unique=True,
        postgresql_where=sa.text("is_primary"),
    )
    op.create_table(
        "assignment_mastery_events",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "answer_id",
            sa.UUID(),
            sa.ForeignKey("assignment_answers.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "student_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column(
            "concept_id",
            sa.UUID(),
            sa.ForeignKey("concepts.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("mastery_before", sa.Float(), nullable=False),
        sa.Column("mastery_after", sa.Float(), nullable=False),
        sa.Column("source_snapshot", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("answer_id", "concept_id", name="uq_assignment_answer_concept"),
    )
    op.create_index(
        "ix_assignment_mastery_events_student_id", "assignment_mastery_events", ["student_id"]
    )


def downgrade():
    op.drop_index("ix_assignment_mastery_events_student_id", table_name="assignment_mastery_events")
    op.drop_table("assignment_mastery_events")
    op.drop_index("uq_material_primary_concept", table_name="material_concepts")
    op.drop_table("material_concepts")
    op.drop_column("mastery_events", "source_snapshot")
    op.drop_column("curriculum_chunks", "material_mapping_version")
    op.drop_column("concepts", "is_active")
    op.drop_column("class_materials", "indexed_mapping_version")
    op.drop_column("class_materials", "mapping_version")
    op.drop_index("ix_classrooms_subject_id", table_name="classrooms")
    op.drop_constraint("fk_classroom_subject", "classrooms", type_="foreignkey")
    op.drop_column("classrooms", "subject_id")
