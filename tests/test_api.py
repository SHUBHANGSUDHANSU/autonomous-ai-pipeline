"""FastAPI route tests."""

import os
import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("GROQ_API_KEY", "test-groq")
os.environ.setdefault("TAVILY_API_KEY", "test-tavily")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/test")
os.environ.setdefault("CELERY_BROKER_URL", "redis://localhost:6379/1")
os.environ.setdefault("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
os.environ.setdefault("AUTO_CREATE_TABLES", "false")
os.environ.setdefault("ENVIRONMENT", "test")

from app.api.deps import get_db_session
from app.api.routes import health as health_route
from app.api.routes import pipeline as pipeline_route
from app.agents import orchestrator
from app.main import app
from app.models.content import Content
from app.tasks import celery_tasks


def test_frontend_root() -> None:
    """App route should serve the interactive dashboard."""

    with TestClient(app) as client:
        response = client.get("/app")

    assert response.status_code == 200
    assert "Autonomous AI Content Pipeline" in response.text


class FakeResult:
    """SQLAlchemy result mock."""

    def __init__(self, items: list[Content], item: Content | None = None) -> None:
        """Store result data."""

        self.items = items
        self.item = item

    def scalar_one(self) -> int:
        """Return total count."""

        return len(self.items)

    def scalar_one_or_none(self) -> Content | None:
        """Return one item or none."""

        return self.item

    def scalars(self) -> "FakeResult":
        """Return self for chained all call."""

        return self

    def all(self) -> list[Content]:
        """Return all items."""

        return self.items


class FakeDbSession:
    """Async database session mock."""

    def __init__(self, items: list[Content], item: Content | None = None) -> None:
        """Store fake rows."""

        self.items = items
        self.item = item
        self.committed = False

    async def execute(self, statement: Any) -> FakeResult:
        """Return fake query result."""

        return FakeResult(self.items, self.item)

    async def commit(self) -> None:
        """Mark commit as called."""

        self.committed = True


def make_content(content_id: uuid.UUID | None = None) -> Content:
    """Create an unsaved content ORM object for response serialization."""

    return Content(
        id=content_id or uuid.uuid4(),
        topic="future of renewable energy",
        title="Future of Renewable Energy",
        body="Final body",
        tags=["energy", "solar", "wind", "storage", "policy"],
        word_count=500,
        readability_score=8.0,
        seo_score=7.0,
        engagement_score=8.0,
        meta_description="Meta",
        publish_status="scheduled",
        scheduled_at=datetime.now(UTC),
        published_at=None,
        created_at=datetime.now(UTC),
        celery_task_id="task-1",
    )


def override_db(session: FakeDbSession) -> None:
    """Override the FastAPI DB dependency."""

    async def _dependency() -> Any:
        yield session

    app.dependency_overrides[get_db_session] = _dependency


def test_post_pipeline_run_async(monkeypatch: pytest.MonkeyPatch) -> None:
    """Async pipeline endpoint should enqueue a Celery task."""

    class FakeTask:
        """Celery task mock."""

        def delay(self, topic: str) -> SimpleNamespace:
            """Return queued task metadata."""

            assert topic == "future of renewable energy"
            return SimpleNamespace(id="task-123")

    monkeypatch.setattr(pipeline_route, "run_pipeline_task", FakeTask())
    with TestClient(app) as client:
        response = client.post(
            "/pipeline/run",
            json={"topic": "future of renewable energy", "async": True},
        )

    assert response.status_code == 200
    assert response.json() == {"task_id": "task-123", "status": "queued"}


def test_post_pipeline_run_sync(monkeypatch: pytest.MonkeyPatch) -> None:
    """Sync pipeline endpoint should return the full pipeline result."""

    async def fake_run_pipeline(topic: str) -> dict[str, Any]:
        """Return a deterministic pipeline state."""

        return {
            "topic": topic,
            "search_queries": [],
            "raw_research": [],
            "summarized_research": "summary",
            "draft_content": "draft",
            "edited_content": "edited",
            "metadata": {},
            "publish_status": "scheduled",
            "error": None,
            "step_history": ["research", "writer", "editor", "scheduler"],
        }

    monkeypatch.setattr(pipeline_route, "run_pipeline", fake_run_pipeline)
    with TestClient(app) as client:
        response = client.post(
            "/pipeline/run",
            json={"topic": "future of renewable energy", "async": False},
        )

    assert response.status_code == 200
    assert response.json()["publish_status"] == "scheduled"


def test_post_pipeline_run_validation_error() -> None:
    """Pipeline run should reject invalid payloads."""

    with TestClient(app) as client:
        response = client.post("/pipeline/run", json={"async": False})

    assert response.status_code == 422


def test_pipeline_status(monkeypatch: pytest.MonkeyPatch) -> None:
    """Pipeline status endpoint should serialize Celery task state."""

    class FakeAsyncResult:
        """Celery AsyncResult mock."""

        status = "SUCCESS"
        result = {"publish_status": "scheduled"}

        def __init__(self, task_id: str, app: Any = None) -> None:
            """Store task id."""

            self.task_id = task_id

        def ready(self) -> bool:
            """Return ready state."""

            return True

    monkeypatch.setattr(pipeline_route, "AsyncResult", FakeAsyncResult)
    with TestClient(app) as client:
        response = client.get("/pipeline/status/task-123")

    assert response.status_code == 200
    assert response.json()["result"] == {"publish_status": "scheduled"}


def test_content_routes_success_and_delete() -> None:
    """Content list, detail, and soft delete routes should work."""

    item = make_content()
    session = FakeDbSession([item], item)
    override_db(session)
    try:
        with TestClient(app) as client:
            list_response = client.get("/content")
            detail_response = client.get(f"/content/{item.id}")
            delete_response = client.delete(f"/content/{item.id}")
    finally:
        app.dependency_overrides.clear()

    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == str(item.id)
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "deleted"
    assert session.committed is True


def test_content_not_found() -> None:
    """Content detail should return 404 for missing ids."""

    override_db(FakeDbSession([], None))
    try:
        with TestClient(app) as client:
            response = client.get(f"/content/{uuid.uuid4()}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404


def test_health_route(monkeypatch: pytest.MonkeyPatch) -> None:
    """Health route should report dependency status."""

    async def ok_redis() -> bool:
        return True

    async def ok_db(db: Any) -> bool:
        return True

    async def ok_celery() -> bool:
        return True

    monkeypatch.setattr(health_route, "_check_redis", ok_redis)
    monkeypatch.setattr(health_route, "_check_db", ok_db)
    monkeypatch.setattr(health_route, "_check_celery", ok_celery)
    override_db(FakeDbSession([], None))
    try:
        with TestClient(app) as client:
            response = client.get("/health")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "redis": True, "db": True, "celery": True}


def test_run_pipeline_celery_task(monkeypatch: pytest.MonkeyPatch) -> None:
    """Celery run task should execute the async orchestrator."""

    async def fake_run_pipeline(topic: str) -> dict[str, Any]:
        """Return fake pipeline output."""

        return {
            "topic": topic,
            "publish_status": "scheduled",
            "error": None,
        }

    monkeypatch.setattr(orchestrator, "run_pipeline", fake_run_pipeline)

    result = celery_tasks.run_pipeline_task.run("agentic ai")

    assert result["topic"] == "agentic ai"
    assert result["publish_status"] == "scheduled"


def test_publish_content_task_marks_content_published(monkeypatch: pytest.MonkeyPatch) -> None:
    """Publish task should update content status."""

    item = make_content()

    class FakePublishResult:
        """Publish query result mock."""

        def scalar_one_or_none(self) -> Content:
            """Return content row."""

            return item

    class FakePublishSession:
        """Session mock for publish task."""

        async def execute(self, statement: Any) -> FakePublishResult:
            """Return fake content."""

            return FakePublishResult()

        async def commit(self) -> None:
            """No-op commit."""

    class FakeContext:
        """Async context manager mock."""

        async def __aenter__(self) -> FakePublishSession:
            """Enter context."""

            return FakePublishSession()

        async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
            """Exit context."""

    monkeypatch.setattr(celery_tasks, "get_session_context", lambda: FakeContext())

    result = celery_tasks.publish_content_task.run(str(item.id))

    assert result == {"content_id": str(item.id), "status": "published"}
    assert item.publish_status == "published"
    assert item.published_at is not None


def test_scheduled_pipeline_beat_queues_topic(monkeypatch: pytest.MonkeyPatch) -> None:
    """Beat task should pop a queued topic and enqueue a pipeline task."""

    class FakeRedisClient:
        """Redis list mock."""

        async def lpop(self, key: str) -> str:
            """Return a queued topic."""

            assert key == "pipeline:topic_queue"
            return "agentic ai"

    class FakeMemory:
        """Memory wrapper mock."""

        client = FakeRedisClient()

        async def close(self) -> None:
            """No-op close."""

    class FakeRunTask:
        """Pipeline task mock."""

        def delay(self, topic: str) -> SimpleNamespace:
            """Return task id."""

            assert topic == "agentic ai"
            return SimpleNamespace(id="queued-task")

    monkeypatch.setattr(celery_tasks, "RedisMemory", lambda: FakeMemory())
    monkeypatch.setattr(celery_tasks, "run_pipeline_task", FakeRunTask())

    result = celery_tasks.scheduled_pipeline_beat.run()

    assert result == {"status": "queued", "topic": "agentic ai", "task_id": "queued-task"}
