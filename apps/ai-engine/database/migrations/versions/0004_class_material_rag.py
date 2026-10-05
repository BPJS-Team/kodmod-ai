"""Versioned classroom material indexing and persistent Tutor context."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0004_class_material_rag"
down_revision = "0003_material_progress"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("class_materials", sa.Column("source_filename", sa.String(300)))
    op.add_column(
        "class_materials",
        sa.Column("rag_status", sa.String(20), nullable=False, server_default="pending"),
    )
    op.add_column("class_materials", sa.Column("rag_error", sa.Text()))
    for name, default in (("content_version", "1"), ("indexed_version", "0"), ("n_chunks", "0")):
        op.add_column(
            "class_materials", sa.Column(name, sa.Integer(), nullable=False, server_default=default)
        )
    op.create_check_constraint(
        "ck_materials_rag_status",
        "class_materials",
        "rag_status IN ('pending', 'processing', 'ready', 'failed')",
    )
    op.add_column("curriculum_chunks", sa.Column("material_id", UUID(as_uuid=True)))
    op.create_foreign_key(
        "fk_chunks_material",
        "curriculum_chunks",
        "class_materials",
        ["material_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.add_column("curriculum_chunks", sa.Column("material_version", sa.Integer()))
    op.create_index("ix_curriculum_chunks_material_id", "curriculum_chunks", ["material_id"])
    for name, table in (("class_id", "classrooms"), ("material_id", "class_materials")):
        op.add_column("learning_sessions", sa.Column(name, UUID(as_uuid=True)))
        op.create_foreign_key(
            f"fk_learning_sessions_{name}",
            "learning_sessions",
            table,
            [name],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade():
    for name in ("material_id", "class_id"):
        op.drop_constraint(f"fk_learning_sessions_{name}", "learning_sessions", type_="foreignkey")
        op.drop_column("learning_sessions", name)
    op.drop_index("ix_curriculum_chunks_material_id", table_name="curriculum_chunks")
    op.drop_constraint("fk_chunks_material", "curriculum_chunks", type_="foreignkey")
    op.drop_column("curriculum_chunks", "material_version")
    op.drop_column("curriculum_chunks", "material_id")
    op.drop_constraint("ck_materials_rag_status", "class_materials", type_="check")
    for name in (
        "n_chunks",
        "indexed_version",
        "content_version",
        "rag_error",
        "rag_status",
        "source_filename",
    ):
        op.drop_column("class_materials", name)
