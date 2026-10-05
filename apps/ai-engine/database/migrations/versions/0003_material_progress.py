"""Private student reading completion and bookmarks."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0003_material_progress"
down_revision = "0002_classrooms"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "material_progress",
        sa.Column(
            "material_id",
            UUID(as_uuid=True),
            sa.ForeignKey("class_materials.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "student_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("completed", sa.Boolean(), nullable=False),
        sa.Column("bookmarked", sa.Boolean(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )


def downgrade():
    op.drop_table("material_progress")
