"""Agent unit tests with mocked LLM, search, scrape, memory, and database seams."""

import os
import uuid
from contextlib import AbstractAsyncContextManager
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any

import pytest

os.environ.setdefault("GROQ_API_KEY", "test-groq")
os.environ.setdefault("TAVILY_API_KEY", "test-tavily")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/test")
os.environ.setdefault("CELERY_BROKER_URL", "redis://localhost:6379/1")
os.environ.setdefault("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
os.environ.setdefault("AUTO_CREATE_TABLES", "false")
os.environ.setdefault("ENVIRONMENT", "test")

from app.agents.editor_agent import EditorAgent
from app.agents import orchestrator
from app.agents.research_agent import ResearchAgent
from app.agents.scheduler_agent import SchedulerAgent
from app.agents.writer_agent import WriterAgent
from app.models.pipeline_state import PipelineState


class FakeLLM:
    """Deterministic async LLM mock."""

    def __init__(self, responses: list[str]) -> None:
        """Store response queue."""

        self.responses = responses
        self.calls: list[str] = []

    async def ainvoke(self, prompt: str) -> SimpleNamespace:
        """Return the next queued response."""

        self.calls.append(prompt)
        if not self.responses:
            raise AssertionError("FakeLLM response queue is empty")
        return SimpleNamespace(
            content=self.responses.pop(0),
            response_metadata={"token_usage": {"total_tokens": 12}},
        )


class FakeMemory:
    """In-memory Redis replacement."""

    def __init__(self) -> None:
        """Create an empty store."""

        self.store: dict[str, str] = {}

    async def save(self, key: str, value: str, ttl_seconds: int = 3600) -> None:
        """Save a value."""

        self.store[key] = value

    async def get(self, key: str) -> str | None:
        """Read a value."""

        return self.store.get(key)

    async def delete(self, key: str) -> None:
        """Delete a value."""

        self.store.pop(key, None)


class FakeSearchTool:
    """Search tool mock."""

    async def search(self, query: str) -> list[dict[str, str | float]]:
        """Return one result per query."""

        return [{"url": f"https://example.com/{query}", "content": f"Snippet {query}", "score": 0.9}]


class FakeScrapeTool:
    """Scrape tool mock."""

    async def scrape(self, url: str) -> str:
        """Return page content."""

        return f"Full content from {url}"


def make_state(topic: str = "renewable energy") -> PipelineState:
    """Return a valid pipeline state."""

    return {
        "topic": topic,
        "search_queries": [],
        "raw_research": [],
        "summarized_research": "",
        "draft_content": "",
        "edited_content": "",
        "metadata": {"quality_retries": 0},
        "publish_status": "pending",
        "error": None,
        "step_history": [],
    }


@pytest.mark.asyncio
async def test_research_agent_transforms_state() -> None:
    """Research agent should generate queries, collect results, and summarize."""

    state = make_state()
    agent = ResearchAgent(
        llm=FakeLLM(['["solar storage trends", "grid modernization", "policy incentives"]', "Research brief"]),
        memory=FakeMemory(),
        search_tool=FakeSearchTool(),
        scrape_tool=FakeScrapeTool(),
    )

    result = await agent.run(state)

    assert result["search_queries"] == [
        "solar storage trends",
        "grid modernization",
        "policy incentives",
    ]
    assert len(result["raw_research"]) == 3
    assert result["summarized_research"] == "Research brief"
    assert "research" in result["step_history"]
    assert result["error"] is None


@pytest.mark.asyncio
async def test_writer_agent_transforms_state() -> None:
    """Writer agent should draft content and extract metadata."""

    state = make_state()
    state["summarized_research"] = "Research about storage, policy, and deployment."
    draft = "# The Future of Renewable Energy\n\nRenewable energy is expanding with storage and policy support."
    agent = WriterAgent(llm=FakeLLM([draft]), memory=FakeMemory())

    result = await agent.run(state)

    assert result["draft_content"] == draft
    assert result["metadata"]["title"] == "The Future of Renewable Energy"
    assert result["metadata"]["word_count"] > 5
    assert len(result["metadata"]["tags"]) == 5
    assert "writer" in result["step_history"]


@pytest.mark.asyncio
async def test_base_agent_llm_helper_supports_invoke_and_callable() -> None:
    """BaseAgent LLM helper should support invoke and callable interfaces."""

    class InvokeLLM:
        """Synchronous invoke LLM mock."""

        def invoke(self, prompt: str) -> SimpleNamespace:
            """Return list content and usage metadata."""

            return SimpleNamespace(
                content=["part one", "part two"],
                response_metadata={"usage": {"total": "5"}},
            )

    async def callable_llm(prompt: str) -> SimpleNamespace:
        """Callable async LLM mock."""

        return SimpleNamespace(content="callable response", response_metadata={})

    memory = FakeMemory()
    await memory.save("existing", "value")
    invoke_agent = WriterAgent(llm=InvokeLLM(), memory=memory)
    callable_agent = WriterAgent(llm=callable_llm, memory=FakeMemory())

    assert await invoke_agent._call_llm("prompt") == "part one\npart two"
    assert invoke_agent.last_token_count == 5
    assert await invoke_agent._get_from_memory("existing") == "value"
    assert await callable_agent._call_llm("prompt") == "callable response"


@pytest.mark.asyncio
async def test_editor_agent_transforms_state() -> None:
    """Editor agent should run editing passes, score, and store edited content."""

    state = make_state()
    state["draft_content"] = "Draft article."
    agent = EditorAgent(
        llm=FakeLLM(
            [
                "Grammar pass article.",
                "Structure pass article.",
                "SEO pass article.\nMeta Description: A concise search summary.",
                '{"readability_score": 8, "seo_score": 7, "engagement_score": 8}',
            ]
        ),
        memory=FakeMemory(),
    )

    result = await agent.run(state)

    assert result["edited_content"] == "SEO pass article."
    assert result["metadata"]["readability_score"] == 8.0
    assert result["metadata"]["seo_score"] == 7.0
    assert result["metadata"]["engagement_score"] == 8.0
    assert result["metadata"]["meta_description"] == "A concise search summary."
    assert "editor" in result["step_history"]


class FakeScalarResult:
    """SQLAlchemy result mock."""

    def scalar_one_or_none(self) -> Any:
        """Return no latest scheduled record."""

        return None


class FakeSession(AbstractAsyncContextManager):
    """Async SQLAlchemy session mock."""

    def __init__(self) -> None:
        """Track added objects and commits."""

        self.added: list[Any] = []
        self.commits = 0

    async def __aenter__(self) -> "FakeSession":
        """Enter context."""

        return self

    async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        """Exit context."""

    async def execute(self, statement: Any) -> FakeScalarResult:
        """Return no scheduled content."""

        return FakeScalarResult()

    def add(self, item: Any) -> None:
        """Capture added content and assign a primary key."""

        if getattr(item, "id", None) is None:
            item.id = uuid.uuid4()
        self.added.append(item)

    async def commit(self) -> None:
        """Increment commit count."""

        self.commits += 1

    async def refresh(self, item: Any) -> None:
        """Ensure refreshed item has an id."""

        if getattr(item, "id", None) is None:
            item.id = uuid.uuid4()


@pytest.mark.asyncio
async def test_scheduler_agent_transforms_state() -> None:
    """Scheduler agent should persist metadata and enqueue publication."""

    state = make_state()
    state["edited_content"] = "Final content body"
    state["metadata"].update(
        {
            "title": "Final Title",
            "tags": ["ai", "content", "agents", "seo", "automation"],
            "word_count": 500,
            "readability_score": 8,
            "seo_score": 7,
            "engagement_score": 8,
            "meta_description": "Meta",
        }
    )
    fake_session = FakeSession()

    def session_factory() -> FakeSession:
        """Return the fake session context manager."""

        return fake_session

    def enqueue_publish(content_id: str, scheduled_at: datetime) -> str:
        """Return a deterministic Celery task id."""

        assert uuid.UUID(content_id)
        assert scheduled_at.tzinfo == UTC
        return "publish-task-1"

    agent = SchedulerAgent(
        llm=FakeLLM([]),
        memory=FakeMemory(),
        session_factory=session_factory,
        enqueue_publish=enqueue_publish,
    )

    result = await agent.run(state)

    assert result["publish_status"] == "scheduled"
    assert result["metadata"]["celery_task_id"] == "publish-task-1"
    assert result["metadata"]["content_id"]
    assert fake_session.commits == 2
    assert "scheduler" in result["step_history"]


class FakeGraphAgent:
    """Graph agent mock for orchestrator tests."""

    def __init__(self, name: str) -> None:
        """Store node name."""

        self.name = name

    async def run(self, state: PipelineState) -> PipelineState:
        """Mutate state according to graph node responsibility."""

        state["step_history"].append(self.name)
        if self.name == "research":
            state["summarized_research"] = "summary"
        if self.name == "writer":
            state["draft_content"] = "draft"
        if self.name == "editor":
            state["edited_content"] = "edited"
            retry_count = int(state["metadata"].get("quality_retries") or 0)
            score = 5.0 if retry_count == 0 else 8.0
            state["metadata"].update(
                {
                    "readability_score": score,
                    "seo_score": score,
                    "engagement_score": score,
                }
            )
        if self.name == "scheduler":
            state["publish_status"] = "scheduled"
        return state


@pytest.mark.asyncio
async def test_orchestrator_runs_quality_retry_loop() -> None:
    """LangGraph should loop from editor back to writer when scores are low."""

    pipeline = orchestrator.build_pipeline(
        research_agent=FakeGraphAgent("research"),  # type: ignore[arg-type]
        writer_agent=FakeGraphAgent("writer"),  # type: ignore[arg-type]
        editor_agent=FakeGraphAgent("editor"),  # type: ignore[arg-type]
        scheduler_agent=FakeGraphAgent("scheduler"),  # type: ignore[arg-type]
    )

    result = await pipeline.ainvoke(orchestrator.create_initial_state("agentic content"))

    assert result["publish_status"] == "scheduled"
    assert result["step_history"].count("writer") == 2
    assert "quality_retry" in result["step_history"]
    assert result["metadata"]["quality_retries"] == 1


@pytest.mark.asyncio
async def test_run_pipeline_invokes_compiled_graph(monkeypatch: pytest.MonkeyPatch) -> None:
    """run_pipeline should create initial state and return graph output."""

    class FakePipeline:
        """Compiled graph mock."""

        async def ainvoke(self, state: PipelineState) -> PipelineState:
            """Return a completed state."""

            state["publish_status"] = "scheduled"
            state["step_history"].append("done")
            return state

    monkeypatch.setattr(orchestrator, "build_pipeline", lambda: FakePipeline())

    result = await orchestrator.run_pipeline("agentic content")

    assert result["topic"] == "agentic content"
    assert result["publish_status"] == "scheduled"
    assert result["step_history"] == ["done"]
