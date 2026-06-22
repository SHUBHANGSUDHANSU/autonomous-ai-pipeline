"""Tool wrapper tests with mocked external clients."""

import os
from pathlib import Path
from typing import Any

import httpx
import pytest
import yaml
from redis.exceptions import RedisError

os.environ.setdefault("GROQ_API_KEY", "test-groq")
os.environ.setdefault("TAVILY_API_KEY", "test-tavily")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/test")
os.environ.setdefault("CELERY_BROKER_URL", "redis://localhost:6379/1")
os.environ.setdefault("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
os.environ.setdefault("AUTO_CREATE_TABLES", "false")
os.environ.setdefault("ENVIRONMENT", "test")

from app.tools import memory_tool, scrape_tool, search_tool
from app.tools.memory_tool import RedisMemory
from app.tools.scrape_tool import ScrapeTool
from app.tools.search_tool import TavilySearchTool
from app.utils.retry import async_retry


@pytest.mark.asyncio
async def test_search_tool_normalizes_tavily_results(monkeypatch: pytest.MonkeyPatch) -> None:
    """Search tool should normalize and limit Tavily results."""

    class FakeTavilySearchResults:
        """LangChain Tavily tool mock."""

        def __init__(self, max_results: int, tavily_api_key: str | None = None) -> None:
            """Store max results."""

            self.max_results = max_results
            self.tavily_api_key = tavily_api_key

        async def ainvoke(self, query: str) -> list[dict[str, Any]]:
            """Return fake Tavily rows."""

            return [
                {"url": "https://a.example", "content": "A", "score": "0.9"},
                {"url": "https://b.example", "content": "B", "score": 0.8},
            ]

    monkeypatch.setattr(search_tool, "TavilySearchResults", FakeTavilySearchResults)
    tool = TavilySearchTool(max_results=1)

    results = await tool.search("renewable energy")

    assert results == [{"url": "https://a.example", "content": "A", "score": 0.9}]


@pytest.mark.asyncio
async def test_scrape_tool_extracts_clean_text(monkeypatch: pytest.MonkeyPatch) -> None:
    """Scrape tool should strip navigation and scripts from HTML."""

    class FakeResponse:
        """HTTP response mock."""

        text = """
        <html><body><nav>Menu</nav><main><h1>Title</h1><p>Useful text.</p></main>
        <script>bad()</script></body></html>
        """

        def raise_for_status(self) -> None:
            """No-op status check."""

    class FakeAsyncClient:
        """httpx.AsyncClient mock."""

        def __init__(self, *args: Any, **kwargs: Any) -> None:
            """Ignore constructor args."""

        async def __aenter__(self) -> "FakeAsyncClient":
            """Enter context."""

            return self

        async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
            """Exit context."""

        async def get(self, url: str) -> FakeResponse:
            """Return fake HTML."""

            return FakeResponse()

    monkeypatch.setattr(scrape_tool.httpx, "AsyncClient", FakeAsyncClient)
    text = await ScrapeTool().scrape("https://example.com")

    assert text == "Title Useful text."


@pytest.mark.asyncio
async def test_scrape_tool_returns_empty_on_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Scrape tool should gracefully return empty text on request errors."""

    class FakeAsyncClient:
        """Failing httpx.AsyncClient mock."""

        def __init__(self, *args: Any, **kwargs: Any) -> None:
            """Ignore constructor args."""

        async def __aenter__(self) -> "FakeAsyncClient":
            """Enter context."""

            return self

        async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
            """Exit context."""

        async def get(self, url: str) -> Any:
            """Raise request error."""

            raise httpx.RequestError("network down")

    monkeypatch.setattr(scrape_tool.httpx, "AsyncClient", FakeAsyncClient)
    text = await ScrapeTool().scrape("https://example.com")

    assert text == ""


@pytest.mark.asyncio
async def test_memory_tool_save_get_delete(monkeypatch: pytest.MonkeyPatch) -> None:
    """Memory tool should save, read, and delete Redis values."""

    class FakeRedis:
        """Redis client mock."""

        def __init__(self) -> None:
            """Create store."""

            self.store: dict[str, str] = {}

        async def set(self, key: str, value: str, ex: int) -> None:
            """Set key."""

            self.store[key] = value

        async def get(self, key: str) -> str | None:
            """Get key."""

            return self.store.get(key)

        async def delete(self, key: str) -> None:
            """Delete key."""

            self.store.pop(key, None)

        async def aclose(self) -> None:
            """Close client."""

    fake = FakeRedis()
    monkeypatch.setattr(memory_tool.redis, "from_url", lambda *args, **kwargs: fake)
    memory = RedisMemory("redis://test")

    await memory.save("k", "v")
    assert await memory.get("k") == "v"
    await memory.delete("k")
    assert await memory.get("k") is None


@pytest.mark.asyncio
async def test_memory_tool_raises_redis_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    """Memory tool should preserve Redis exceptions after logging."""

    class FailingRedis:
        """Failing Redis client mock."""

        async def set(self, key: str, value: str, ex: int) -> None:
            """Raise Redis error."""

            raise RedisError("redis down")

    monkeypatch.setattr(memory_tool.redis, "from_url", lambda *args, **kwargs: FailingRedis())
    memory = RedisMemory("redis://test")

    with pytest.raises(RedisError):
        await memory.save("k", "v")


@pytest.mark.asyncio
async def test_async_retry_retries_then_succeeds() -> None:
    """Retry helper should retry transient failures."""

    calls = 0

    @async_retry(retries=3, initial_delay=0, max_delay=0)
    async def flaky() -> str:
        """Fail once, then succeed."""

        nonlocal calls
        calls += 1
        if calls == 1:
            raise ValueError("temporary")
        return "ok"

    assert await flaky() == "ok"
    assert calls == 2


@pytest.mark.asyncio
async def test_async_retry_raises_last_error() -> None:
    """Retry helper should raise the final error after exhausting attempts."""

    @async_retry(retries=2, initial_delay=0, max_delay=0)
    async def always_fails() -> None:
        """Always fail."""

        raise RuntimeError("permanent")

    with pytest.raises(RuntimeError, match="permanent"):
        await always_fails()


def test_docker_compose_defines_required_services() -> None:
    """Docker Compose should define the full six-service production stack."""

    compose_path = Path(__file__).resolve().parents[1] / "docker-compose.yml"
    compose = yaml.safe_load(compose_path.read_text())
    services = compose["services"]

    assert set(services) == {"api", "worker", "beat", "redis", "db", "flower"}
    assert services["api"]["ports"] == ["8000:8000"]
    assert services["flower"]["ports"] == ["5555:5555"]
    assert services["redis"]["image"] == "redis:7-alpine"
    assert services["db"]["image"] == "postgres:15-alpine"
    assert services["redis"]["healthcheck"]["test"] == ["CMD", "redis-cli", "ping"]
    assert "pg_isready" in " ".join(services["db"]["healthcheck"]["test"])
    for service in services.values():
        assert "pipeline_network" in service["networks"]


def test_dockerfile_uses_multistage_non_root_runtime() -> None:
    """Dockerfile should use a multi-stage build and a non-root runtime user."""

    dockerfile = (Path(__file__).resolve().parents[1] / "Dockerfile").read_text()

    assert "FROM node:20-alpine AS frontend-builder" in dockerfile
    assert "npm ci" in dockerfile
    assert "npm run build" in dockerfile
    assert "FROM python:3.11-slim AS builder" in dockerfile
    assert "FROM python:3.11-slim AS runtime" in dockerfile
    assert "COPY --from=frontend-builder" in dockerfile
    assert "poetry check" in dockerfile
    assert "pip install --no-cache-dir -r requirements.txt" in dockerfile
    assert "USER appuser" in dockerfile
    assert 'CMD ["uvicorn", "app.main:app"' in dockerfile
