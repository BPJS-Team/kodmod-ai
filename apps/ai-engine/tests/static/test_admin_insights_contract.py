from pathlib import Path

import pytest


@pytest.mark.static
def test_admin_insights_routes_are_redacted_and_bounded():
    source = (Path(__file__).parents[2] / "api" / "routes" / "admin_insights.py").read_text(
        encoding="utf-8"
    )

    assert '@router.get("/insights/overview")' in source
    assert '@router.get("/activity")' in source
    assert 'le=100' in source
    assert '"password"' not in source
    assert '"token"' not in source
    assert '"api_key"' not in source
