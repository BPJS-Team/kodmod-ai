"""Stage 4 §10 - contract fuzzing with Schemathesis against the live container.

Spec: docs/testplan/04-api.md §10 (KM-API-100..102).

Every 5xx Schemathesis finds is a defect. All OpenAPI operations are included,
with ten generated examples per operation. Authenticated happy paths are
exercised separately by the HTTP journey tests.
"""

from __future__ import annotations

import os

import pytest
from hypothesis import HealthCheck, Phase, settings

schemathesis = pytest.importorskip("schemathesis")

pytestmark = [pytest.mark.api, pytest.mark.slow]

BASE_URL = os.environ.get("KODMOD_API_BASE_URL", "http://localhost:8000")

try:
    schema = schemathesis.openapi.from_url(f"{BASE_URL}/openapi.json")
except Exception as exc:  # pragma: no cover
    pytest.skip(f"cannot load OpenAPI from {BASE_URL}: {exc}", allow_module_level=True)


@schema.parametrize()
@settings(
    max_examples=10,
    deadline=None,
    phases=[Phase.generate],
    suppress_health_check=[HealthCheck.filter_too_much],
)
def test_km_api_100_no_server_errors(case) -> None:  # type: ignore[no-untyped-def]
    # KM-API-100 gates only on "no server error" (5xx). Status-code / schema
    # conformance is a separate concern tracked in the contract stage.
    response = case.call()
    assert response.status_code < 500, (
        f"{case.method} {case.path} returned {response.status_code}: {response.text[:300]}"
    )
