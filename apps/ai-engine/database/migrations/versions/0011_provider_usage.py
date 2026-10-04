"""Persist measured, redacted provider usage independently of learning writes."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0011_provider_usage"
down_revision = "0010_durable_material_jobs"
branch_labels = depends_on = None


def upgrade():
    op.create_table("provider_usage",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("request_id", UUID(as_uuid=True), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True)),
        sa.Column("target_id", UUID(as_uuid=True)), sa.Column("target_type", sa.String(40)), sa.Column("language", sa.String(8)),
        sa.Column("provider", sa.String(20), nullable=False), sa.Column("service", sa.String(40), nullable=False),
        sa.Column("model", sa.String(120), nullable=False), sa.Column("status", sa.String(20), nullable=False),
        sa.Column("error_code", sa.String(40)), sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("input_tokens", sa.Integer()), sa.Column("output_tokens", sa.Integer()), sa.Column("total_tokens", sa.Integer()),
        sa.Column("characters", sa.Integer()), sa.Column("audio_bytes", sa.Integer()), sa.Column("audio_seconds", sa.Float()),
        sa.Column("estimated_cost_usd", sa.Numeric(18, 8)), sa.Column("pricing_snapshot", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("provider IN ('openai','elevenlabs')", name="ck_provider_usage_provider"),
        sa.CheckConstraint("status IN ('success','error','cancelled','cache_hit')", name="ck_provider_usage_status"),
        sa.CheckConstraint("latency_ms >= 0", name="ck_provider_usage_latency"),
        sa.CheckConstraint("input_tokens >= 0 AND output_tokens >= 0 AND total_tokens >= 0 AND characters >= 0 AND audio_bytes >= 0 AND audio_seconds >= 0 AND estimated_cost_usd >= 0", name="ck_provider_usage_units"))
    for name, columns in [("ix_provider_usage_created", ["created_at"]), ("ix_provider_usage_filter", ["provider", "status", "created_at"]), ("ix_provider_usage_request_id", ["request_id"]), ("ix_provider_usage_actor_id", ["actor_id"])]:
        op.create_index(name, "provider_usage", columns)


def downgrade():
    op.drop_table("provider_usage")
