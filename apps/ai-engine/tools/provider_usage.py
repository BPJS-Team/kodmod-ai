"""Measure provider responses without storing prompts, transcripts or credentials."""
from __future__ import annotations

import asyncio
import json
import logging
import math
import re
import time
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, replace
from decimal import Decimal, InvalidOperation

from langchain_core.callbacks import AsyncCallbackHandler
from prometheus_client import Counter
from sqlalchemy.exc import IntegrityError

from config.settings import settings
from database.models import ProviderUsage
from database.session import async_session

log = logging.getLogger(__name__)
dropped_usage = Counter("kodmod_provider_usage_dropped_total", "Provider metadata writes unavailable")


@dataclass(frozen=True)
class UsageContext:
    request_id: uuid.UUID
    actor_id: uuid.UUID | None = None
    target_id: uuid.UUID | None = None
    target_type: str | None = None
    language: str | None = None


_context: ContextVar[UsageContext | None] = ContextVar("provider_usage_context", default=None)
current_usage_context = _context.get


@contextmanager
def usage_context(**values):
    context = _context.get() or UsageContext(request_id=uuid.uuid4())
    token = _context.set(replace(context, **values))
    try:
        yield _context.get()
    finally:
        _context.reset(token)


def set_usage_actor(actor_id):
    # Called only after database-backed authentication. It grants no access.
    context = _context.get()
    if context is not None:
        _context.set(replace(context, actor_id=actor_id))


class ProviderContextMiddleware:
    """ASGI context persists through streamed responses and resets on completion."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] not in {"http", "websocket"}:
            return await self.app(scope, receive, send)
        with usage_context(request_id=uuid.uuid4(), actor_id=None, target_id=None, target_type=None, language=None):
            await self.app(scope, receive, send)


def error_code(error):
    if isinstance(error, asyncio.CancelledError):
        return "cancelled"
    code = getattr(error, "status_code", None)
    if code is None:
        code = getattr(getattr(error, "response", None), "status_code", None)
    if isinstance(code, int) and 400 <= code <= 599:
        return f"http_{code}"
    if isinstance(error, TimeoutError) or "timeout" in type(error).__name__.lower():
        return "timeout"
    return "provider_error"


def count(value):
    return value if isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= 2_000_000_000 else None


def estimate_cost(provider, model, status, **units):
    if status == "cache_hit":
        return Decimal(0), {"currency": "USD", "source": "cache"}
    if status != "success":
        return None, None
    try:
        prices = json.loads(settings.PROVIDER_PRICES_JSON)
        rates = prices.get(f"{provider}:{model}", {})
        if not isinstance(rates, dict):
            return None, None
        needed = {"input_per_million": ("input_tokens", 1_000_000), "output_per_million": ("output_tokens", 1_000_000)} if provider == "openai" else ({"characters_per_million": ("characters", 1_000_000)} if units.get("characters") is not None else {"audio_per_minute": ("audio_seconds", 60)})
        result, snapshot = Decimal(0), {"currency": "USD", "source": "configured"}
        for key, (unit, divisor) in needed.items():
            value = units.get(unit)
            if value == 0:
                continue
            if value is None or key not in rates:
                return None, None
            rate = Decimal(str(rates[key]))
            if not rate.is_finite() or rate < 0 or rate > 1_000_000_000:
                return None, None
            snapshot[key] = str(rate)
            result += Decimal(str(value)) * rate / divisor
        # No configured model price is still unknown, including zero-unit replies.
        if not rates:
            return None, None
        return result.quantize(Decimal("0.00000001")), snapshot
    except (ValueError, TypeError, AttributeError, InvalidOperation):
        return None, None


async def record_usage(*, provider, service, model, status, latency_ms, context=None, event_id=None, error=None,
                       input_tokens=None, output_tokens=None, total_tokens=None, characters=None, audio_bytes=None, audio_seconds=None):
    """Independent short transaction: learning writes do not depend on telemetry."""
    context = context or _context.get() or UsageContext(request_id=uuid.uuid4())
    units = {"input_tokens": count(input_tokens), "output_tokens": count(output_tokens), "total_tokens": count(total_tokens), "characters": count(characters), "audio_bytes": count(audio_bytes)}
    units["audio_seconds"] = float(audio_seconds) if isinstance(audio_seconds, (int, float)) and not isinstance(audio_seconds, bool) and math.isfinite(audio_seconds) and 0 <= audio_seconds <= 36000 else None
    model = model if isinstance(model, str) and re.fullmatch(r"[\w.:/-]{1,120}", model) else "unknown"
    cost, price = estimate_cost(provider, model, status, **units)
    event = ProviderUsage(id=event_id or uuid.uuid4(), request_id=context.request_id, actor_id=context.actor_id,
        target_id=context.target_id, target_type=context.target_type, language=context.language,
        provider=provider, service=service, model=model, status=status, latency_ms=max(0, int(latency_ms)),
        error_code=error_code(error) if error is not None else None, estimated_cost_usd=cost, pricing_snapshot=price, **units)
    try:
        async with asyncio.timeout(3):
            async with async_session() as session:
                session.add(event)
    except IntegrityError:
        # Duplicate callback receipts are already persisted; no raw DB exception.
        pass
    except Exception:
        dropped_usage.inc()
        log.warning("Provider usage could not be saved")


class ProviderUsageHandler(AsyncCallbackHandler):
    run_inline = True

    def __init__(self, service, model):
        self.service, self.model, self.runs = service, model, {}

    async def on_chat_model_start(self, serialized, messages, *, run_id, **kwargs):
        self.runs[run_id] = (time.monotonic(), _context.get() or UsageContext(request_id=uuid.uuid4()))

    async def on_llm_end(self, response, *, run_id, **kwargs):
        state = self.runs.pop(run_id, None)
        if state is None:
            return
        started, context = state
        tokens = (response.llm_output or {}).get("token_usage") or {}
        input_tokens, output_tokens, total_tokens = tokens.get("prompt_tokens"), tokens.get("completion_tokens"), tokens.get("total_tokens")
        if response.generations and response.generations[0]:
            message = getattr(response.generations[0][0], "message", None)
            usage = getattr(message, "usage_metadata", None)
            if isinstance(usage, dict):
                input_tokens, output_tokens, total_tokens = usage.get("input_tokens"), usage.get("output_tokens"), usage.get("total_tokens")
        await record_usage(provider="openai", service=self.service, model=self.model, status="success", latency_ms=(time.monotonic() - started) * 1000,
            event_id=run_id, context=context, input_tokens=input_tokens, output_tokens=output_tokens, total_tokens=total_tokens)

    async def on_llm_error(self, error, *, run_id, **kwargs):
        state = self.runs.pop(run_id, None)
        if state:
            started, context = state
            await record_usage(provider="openai", service=self.service, model=self.model, status="cancelled" if isinstance(error, asyncio.CancelledError) else "error",
                latency_ms=(time.monotonic() - started) * 1000, event_id=run_id, context=context, error=error)


class MeasuredEmbeddingClient:
    """Wrap the SDK transport to read usage that LangChain's vector API omits."""
    def __init__(self, client, model):
        self.client, self.model = client, model

    async def create(self, **kwargs):
        started = time.monotonic()
        try:
            response = await self.client.create(**kwargs)
        except BaseException as error:
            await record_usage(provider="openai", service="embedding", model=self.model, status="cancelled" if isinstance(error, asyncio.CancelledError) else "error", latency_ms=(time.monotonic() - started) * 1000, error=error)
            raise
        body = response if isinstance(response, dict) else response.model_dump()
        tokens = body.get("usage") or {}
        await record_usage(provider="openai", service="embedding", model=self.model, status="success", latency_ms=(time.monotonic() - started) * 1000,
            input_tokens=tokens.get("prompt_tokens"), output_tokens=0 if "prompt_tokens" in tokens else None, total_tokens=tokens.get("total_tokens"))
        return response
