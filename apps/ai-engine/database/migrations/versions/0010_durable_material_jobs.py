"""Private source artifacts and durable import/index queue.

Revision ID: 0010_durable_material_jobs
Revises: 0009_material_concepts
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0010_durable_material_jobs"
down_revision = "0009_material_concepts"
branch_labels = depends_on = None


def upgrade():
    op.create_table(
        "background_jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("target_id", UUID(as_uuid=True), nullable=False),
        sa.Column("dedupe_key", sa.String(200), nullable=False, unique=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON()),
        sa.Column("state", sa.String(20), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("lease_token", UUID(as_uuid=True)),
        sa.Column("lease_expires_at", sa.DateTime(timezone=True)),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("error_message", sa.String(300)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "state IN ('pending','running','retry','complete','failed')",
            name="ck_background_jobs_state",
        ),
    )
    op.create_index(
        "ix_background_jobs_claim", "background_jobs", ["state", "available_at", "lease_expires_at"]
    )
    op.create_table(
        "material_imports",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "class_id",
            UUID(as_uuid=True),
            sa.ForeignKey("classrooms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "uploaded_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("filename", sa.String(300), nullable=False),
        sa.Column("stored_path", sa.String(1000), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("job_id", UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_material_imports_class_id", "material_imports", ["class_id"])
    op.add_column("class_materials", sa.Column("source_import_id", UUID(as_uuid=True)))
    op.create_foreign_key(
        "fk_material_source_import",
        "class_materials",
        "material_imports",
        ["source_import_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    # Recover published pending/processing legacy work without requiring a new edit.
    op.execute(
        sa.text("""INSERT INTO background_jobs
        (id, kind, target_id, dedupe_key, payload, state, attempts, max_attempts, available_at, created_at, updated_at)
        SELECT gen_random_uuid(), 'material_index', id,
            'material:' || id || ':' || content_version || ':' || mapping_version,
            json_build_object('version', content_version, 'mapping', mapping_version),
            'pending', 0, 3, now(), now(), now()
        FROM class_materials WHERE published AND (rag_status <> 'ready' OR indexed_version <> content_version OR indexed_mapping_version <> mapping_version OR n_chunks = 0)
    """)
    )
    op.execute(
        sa.text("""INSERT INTO background_jobs
        (id, kind, target_id, dedupe_key, payload, state, attempts, max_attempts, available_at, created_at, updated_at)
        SELECT gen_random_uuid(), 'document_index', id, 'document:' || id, '{}'::json,
            'pending', 0, 3, now(), now(), now() FROM documents WHERE status <> 'ready' OR n_chunks = 0
    """)
    )


def downgrade():
    op.drop_constraint("fk_material_source_import", "class_materials", type_="foreignkey")
    op.drop_column("class_materials", "source_import_id")
    op.drop_table("material_imports")
    op.drop_table("background_jobs")
