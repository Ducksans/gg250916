# -*- coding: utf-8 -*-
"""
Backend integration tests for /memory/status standardized schema and legacy option.

Scope:
- Verify standardized schema from backend.simple_main.app
  - Response includes: { "tiers": { ultra_short, short_term, medium_term, long_term, meta }, "ts_kst": "YYYY-MM-DD HH:mm" }
  - All tier values are non-negative integers
  - Unknown query parameter (?include_legacy=true) does not add 'legacy' to simple_main response
- Verify optional legacy block from backend.main.app (if importable)
  - Response schema is standardized (tiers + ts_kst)
  - With ?include_legacy=true, response also contains 'legacy' key with expected sub-keys
"""

import re
import pytest
from fastapi.testclient import TestClient

# ---------- Helpers ----------

TS_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$")

def assert_tiers_schema(payload: dict) -> None:
    assert isinstance(payload, dict), "Response payload must be a JSON object"
    assert "tiers" in payload, "Response must include 'tiers'"
    assert "ts_kst" in payload, "Response must include 'ts_kst'"

    tiers = payload["tiers"]
    assert isinstance(tiers, dict), "'tiers' must be an object"

    for key in ("ultra_short", "short_term", "medium_term", "long_term", "meta"):
        assert key in tiers, f"'tiers' must include '{key}'"
        assert isinstance(tiers[key], int), f"'{key}' must be an integer"
        assert tiers[key] >= 0, f"'{key}' must be a non-negative integer"

    ts = payload["ts_kst"]
    assert isinstance(ts, str), "'ts_kst' must be a string"
    assert TS_REGEX.match(ts), "'ts_kst' must match format YYYY-MM-DD HH:mm"


# ---------- Tests for backend.simple_main ----------

@pytest.fixture(scope="module")
def client_simple_main():
    # Import here to avoid side-effects at module import time
    from backend.simple_main import app as simple_app
    with TestClient(simple_app) as c:
        yield c


def test_simple_status_schema_ok(client_simple_main: TestClient):
    res = client_simple_main.get("/memory/status")
    assert res.status_code == 200
    data = res.json()
    assert_tiers_schema(data)


def test_simple_status_no_legacy_key_even_if_requested(client_simple_main: TestClient):
    # simple_main does not implement legacy option; unknown query should be ignored
    res = client_simple_main.get("/memory/status?include_legacy=true")
    assert res.status_code == 200
    data = res.json()
    assert_tiers_schema(data)
    assert "legacy" not in data, "simple_main must not include 'legacy' block"


# ---------- Tests for backend.main (optional, skip if not importable) ----------

try:
    from backend import main as backend_main  # may fail due to unresolved imports in some setups
    _MAIN_IMPORTABLE = True
    _MAIN_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - diagnostic info for skip
    _MAIN_IMPORTABLE = False
    _MAIN_IMPORT_ERR = str(_e)


@pytest.fixture(scope="module")
def client_main():
    if not _MAIN_IMPORTABLE:
        pytest.skip(f"backend.main import failed: {_MAIN_IMPORT_ERR}")
    with TestClient(backend_main.app) as c:
        yield c


@pytest.mark.skipif(not _MAIN_IMPORTABLE, reason="backend.main not importable in this environment")
def test_main_status_schema_ok(client_main: TestClient):
    res = client_main.get("/memory/status")
    assert res.status_code == 200
    data = res.json()
    assert_tiers_schema(data)


@pytest.mark.skipif(not _MAIN_IMPORTABLE, reason="backend.main not importable in this environment")
def test_main_status_with_legacy_block(client_main: TestClient):
    res = client_main.get("/memory/status?include_legacy=true")
    assert res.status_code == 200
    data = res.json()
    assert_tiers_schema(data)
    # legacy payload should be present and structured
    assert "legacy" in data, "Expected 'legacy' block when include_legacy=true"
    legacy = data["legacy"]
    assert isinstance(legacy, dict)
    for k in ("layers", "statistics", "patterns", "activity_patterns"):
        assert k in legacy, f"'legacy' must include '{k}'"
