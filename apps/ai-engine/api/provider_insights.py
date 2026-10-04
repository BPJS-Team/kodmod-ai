"""Bounded administrator reporting of recorded provider metadata."""
from datetime import UTC, datetime, timedelta

from sqlalchemy import case, func, or_, select

from database.models import ProviderUsage as Usage
from database.models import User


async def measured_usage(session, *, days, page, limit, provider, status, search):
    since = datetime.now(UTC) - timedelta(days=days)
    window = Usage.created_at >= since
    aggregate = (await session.execute(select(
        func.count(Usage.id),
        func.sum(case((Usage.status == "success", 1), else_=0)),
        func.sum(case((Usage.status.in_(["error", "cancelled"]), 1), else_=0)),
        func.sum(case((Usage.status == "cache_hit", 1), else_=0)),
        func.avg(Usage.latency_ms), func.sum(Usage.estimated_cost_usd),
        func.count(Usage.estimated_cost_usd),
    ).where(window))).one()
    total, success, errors, cache, latency, cost, priced = aggregate
    openai_filter = (window, Usage.provider == "openai", Usage.status == "success")
    token_values = (await session.execute(select(func.sum(Usage.input_tokens), func.sum(Usage.output_tokens), func.sum(Usage.total_tokens), func.count(Usage.total_tokens)).where(*openai_filter))).one()
    conditions = [window]
    if provider:
        conditions.append(Usage.provider == provider)
    if status:
        conditions.append(Usage.status == status)
    if search:
        conditions.append(or_(User.full_name.icontains(search, autoescape=True), Usage.service.icontains(search, autoescape=True), Usage.model.icontains(search, autoescape=True)))
    base = select(Usage, User.full_name).outerjoin(User, Usage.actor_id == User.id).where(*conditions)
    filtered_total = int(await session.scalar(select(func.count()).select_from(base.subquery())) or 0)
    records = (await session.execute(base.order_by(Usage.created_at.desc(), Usage.id.desc()).offset((page - 1) * limit).limit(limit))).all()
    requests = []
    for row, name in records:
        requests.append({
            "id": str(row.id), "timestamp": row.created_at.isoformat(), "provider": "OpenAI" if row.provider == "openai" else "ElevenLabs",
            "service": row.service, "model": row.model, "actor_name": name or ("Akun tidak tersedia" if row.actor_id else "Sistem"),
            "target": f"{row.target_type or ''} {row.target_id or ''}".strip(), "request_id": str(row.request_id),
            "status": row.status, "error_code": row.error_code, "latency_ms": row.latency_ms,
            "input_tokens": row.input_tokens, "output_tokens": row.output_tokens, "total_tokens": row.total_tokens,
            "characters": row.characters, "audio_bytes": row.audio_bytes, "audio_seconds": row.audio_seconds,
            "estimated_cost_usd": float(row.estimated_cost_usd) if row.estimated_cost_usd is not None else None,
        })
    return {
        "period_days": days, "since": since.isoformat(),
        "summary": {"requests": total, "provider_calls": total - (cache or 0), "successes": success or 0, "errors": errors or 0, "cache_hits": cache or 0,
            "average_latency_ms": round(latency) if latency is not None else None,
            "estimated_cost_usd": float(cost) if total and priced == total else None,
            "known_cost_subtotal_usd": float(cost) if cost is not None else None, "unpriced_requests": total - priced},
        "openai_usage": {"usage_available": bool(token_values[3]), "prompt_tokens": token_values[0], "completion_tokens": token_values[1], "total_tokens": token_values[2]},
        "recent_requests": requests, "pagination": {"page": page, "limit": limit, "total": filtered_total, "has_next": page * limit < filtered_total},
    }
