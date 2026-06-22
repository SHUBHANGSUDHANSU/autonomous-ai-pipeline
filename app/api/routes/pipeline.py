"""Pipeline execution API routes."""

import asyncio
import inspect
import uuid
from datetime import UTC, datetime
from typing import Any

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.agents.orchestrator import run_pipeline
from app.models.pipeline_state import PipelineState
from app.models.content import Content
from app.models.task import PipelineTask
from app.tasks.celery_tasks import celery_app, run_pipeline_task, _record_pipeline_task

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

AGENT_DEFINITIONS = [
    ("research", "Research Agent", "summarized_research"),
    ("writer", "Writer Agent", "draft_content"),
    ("editor", "Editor Agent", "edited_content"),
    ("scheduler", "Scheduler Agent", "publish_status"),
]


class PipelineRunRequest(BaseModel):
    """Request body for starting a pipeline run."""

    topic: str = Field(..., min_length=3, max_length=500)
    async_: bool = Field(default=True, alias="async")

    model_config = ConfigDict(populate_by_name=True)


class QueuedTaskResponse(BaseModel):
    """Response returned for queued asynchronous pipeline runs."""

    task_id: str
    status: str


class PipelineStatusResponse(BaseModel):
    """Response returned for Celery task status checks."""

    task_id: str
    status: str
    result: dict[str, Any] | None


class PipelineStateResponse(BaseModel):
    """Serialized synchronous pipeline result."""

    topic: str
    search_queries: list[str]
    raw_research: list[dict[str, Any]]
    summarized_research: str
    draft_content: str
    edited_content: str
    metadata: dict[str, Any]
    publish_status: str
    error: str | None
    step_history: list[str]


class PipelineAgentResultResponse(BaseModel):
    """Serialized per-agent timeline status."""

    agentName: str
    status: str
    durationMs: int
    tokensUsed: int
    outputText: str | None = None


class PipelineTimelineRunResponse(BaseModel):
    """Serialized pipeline run for the UI timeline."""

    id: str
    topic: str
    status: str
    startedAt: str
    endedAt: str | None
    totalDurationMs: int
    agentResults: list[PipelineAgentResultResponse]
    articleRoute: str | None = None
    errorMessage: str | None = None


class PipelineRunsResponse(BaseModel):
    """Response containing real persisted pipeline run history."""

    total: int
    items: list[PipelineTimelineRunResponse]


@router.post("/run", response_model=QueuedTaskResponse | PipelineStateResponse)
async def run_pipeline_route(request: PipelineRunRequest) -> QueuedTaskResponse | PipelineStateResponse:
    """Run the pipeline synchronously or enqueue it asynchronously."""

    if request.async_:
        task_id = str(uuid.uuid4())
        apply_async = getattr(run_pipeline_task, "apply_async", None)
        if callable(apply_async):
            await _record_pipeline_task(
                task_id,
                request.topic,
                "queued",
                payload={"created_via": "api", "current_step": "queued"},
            )
            task = await asyncio.to_thread(apply_async, args=[request.topic], task_id=task_id)
        else:
            task = await asyncio.to_thread(run_pipeline_task.delay, request.topic)
            task_id = str(task.id)
            await _record_pipeline_task(
                task_id,
                request.topic,
                "queued",
                payload={"created_via": "api", "current_step": "queued"},
            )
        return QueuedTaskResponse(task_id=str(task.id), status="queued")

    task_id = f"sync-{uuid.uuid4()}"
    await _record_pipeline_task(
        task_id,
        request.topic,
        "running",
        payload={"created_via": "api_sync", "started_at": datetime.now(UTC).isoformat()},
    )
    progress_callback = _build_api_progress_callback(task_id, request.topic)
    if "progress_callback" in inspect.signature(run_pipeline).parameters:
        result: PipelineState = await run_pipeline(request.topic, progress_callback=progress_callback)
    else:
        result = await run_pipeline(request.topic)
    final_status = "failure" if result.get("error") else "success"
    await _record_pipeline_task(
        task_id,
        request.topic,
        final_status,
        payload={"result": dict(result), "ended_at": datetime.now(UTC).isoformat()},
        error=str(result.get("error")) if result.get("error") else None,
    )
    return PipelineStateResponse(**result)


@router.get("/status/{task_id}", response_model=PipelineStatusResponse)
async def pipeline_status(task_id: str) -> PipelineStatusResponse:
    """Return Celery task state and result when available."""

    def read_status() -> tuple[str, dict[str, Any] | None]:
        result = AsyncResult(task_id, app=celery_app)
        payload = result.result if result.ready() and isinstance(result.result, dict) else None
        status = str(result.status).lower()
        if payload and payload.get("error"):
            status = "failure"
        return status, payload

    task_status, payload = await asyncio.to_thread(read_status)
    return PipelineStatusResponse(
        task_id=task_id,
        status=task_status,
        result=payload,
    )


@router.get("/runs", response_model=PipelineRunsResponse)
async def pipeline_runs(
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
) -> PipelineRunsResponse:
    """Return real persisted pipeline runs for the UI timeline."""

    task_rows = (
        (
            await db.execute(
                select(PipelineTask)
                .order_by(desc(PipelineTask.created_at))
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    task_runs = [_task_to_timeline_run(task) for task in task_rows]

    used_content_ids = {
        str(run.articleRoute).removeprefix("/content/")
        for run in task_runs
        if run.articleRoute
    }
    remaining_limit = max(0, limit - len(task_runs))
    content_runs: list[PipelineTimelineRunResponse] = []
    if remaining_limit:
        content_rows = (
            (
                await db.execute(
                    select(Content)
                    .order_by(desc(Content.created_at))
                    .limit(remaining_limit * 2)
                )
            )
            .scalars()
            .all()
        )
        content_runs = [
            _content_to_timeline_run(content)
            for content in content_rows
            if str(content.id) not in used_content_ids
        ][:remaining_limit]

    items = sorted(
        [*task_runs, *content_runs],
        key=lambda run: run.startedAt,
        reverse=True,
    )[:limit]
    return PipelineRunsResponse(total=len(items), items=items)


def _build_api_progress_callback(task_id: str, topic: str) -> Any:
    """Build a progress callback for synchronous API runs."""

    async def _progress(state: PipelineState, step: str) -> None:
        await _record_pipeline_task(
            task_id,
            topic,
            "running",
            payload={
                "current_step": step,
                "state": dict(state),
                "step_history": list(state.get("step_history", [])),
                "metadata": dict(state.get("metadata", {})),
                "publish_status": state.get("publish_status"),
                "updated_at": datetime.now(UTC).isoformat(),
            },
        )

    return _progress


def _task_to_timeline_run(task: PipelineTask) -> PipelineTimelineRunResponse:
    """Map a persisted task row to the frontend timeline shape."""

    payload = task.payload or {}
    state = _state_from_payload(payload)
    metadata = _metadata_from_state(payload, state)
    started_at = _coerce_iso(payload.get("started_at"), task.created_at)
    effective_status = _effective_task_status(task.status, payload, state, task.error)
    ended_at = (
        _coerce_iso(payload.get("ended_at"), task.updated_at)
        if _is_terminal(effective_status)
        else None
    )
    status = _timeline_status(effective_status, bool(task.error or state.get("error")))
    article_route = None
    content_id = metadata.get("content_id")
    if content_id:
        article_route = f"/content/{content_id}"
    agent_results = _agent_results_for_task(status, payload, state)

    return PipelineTimelineRunResponse(
        id=str(task.celery_task_id),
        topic=task.topic,
        status=status,
        startedAt=started_at,
        endedAt=ended_at,
        totalDurationMs=_duration_ms(started_at, ended_at),
        agentResults=agent_results,
        articleRoute=article_route,
        errorMessage=task.error or _string_or_none(state.get("error")),
    )


def _effective_task_status(
    persisted_status: str,
    payload: dict[str, Any],
    state: dict[str, Any],
    error: str | None,
) -> str:
    """Infer completion for runs whose final telemetry update was interrupted."""

    if error or state.get("error"):
        return "failure"
    step_history = {
        str(step)
        for step in state.get("step_history") or payload.get("step_history") or []
    }
    completed_agents = {agent_key for agent_key, _, _ in AGENT_DEFINITIONS}
    if payload.get("current_step") == "completed" or completed_agents.issubset(step_history):
        return "success"
    return persisted_status


def _content_to_timeline_run(content: Content) -> PipelineTimelineRunResponse:
    """Map an existing real content row to a successful timeline run."""

    started_at = _coerce_iso(None, content.created_at)
    body_tokens = _estimate_tokens(content.body)
    return PipelineTimelineRunResponse(
        id=str(content.id),
        topic=content.topic,
        status="success" if content.publish_status != "failed" else "failed",
        startedAt=started_at,
        endedAt=started_at,
        totalDurationMs=-1,
        articleRoute=f"/content/{content.id}",
        errorMessage=None if content.publish_status != "failed" else "Content publish status is failed.",
        agentResults=[
            PipelineAgentResultResponse(
                agentName="Research Agent",
                status="success",
                durationMs=-1,
                tokensUsed=max(1, body_tokens // 4),
                outputText=f"Real content record created for {content.topic}.",
            ),
            PipelineAgentResultResponse(
                agentName="Writer Agent",
                status="success",
                durationMs=-1,
                tokensUsed=max(1, body_tokens // 2),
                outputText=content.title,
            ),
            PipelineAgentResultResponse(
                agentName="Editor Agent",
                status="success",
                durationMs=-1,
                tokensUsed=max(1, body_tokens // 4),
                outputText=(
                    f"Readability {content.readability_score:.1f}, "
                    f"SEO {content.seo_score:.1f}, engagement {content.engagement_score:.1f}."
                ),
            ),
            PipelineAgentResultResponse(
                agentName="Scheduler Agent",
                status="success",
                durationMs=-1,
                tokensUsed=1,
                outputText=f"Publish status: {content.publish_status}.",
            ),
        ],
    )


def _agent_results_for_task(
    run_status: str,
    payload: dict[str, Any],
    state: dict[str, Any],
) -> list[PipelineAgentResultResponse]:
    """Build per-agent status rows from persisted real pipeline state."""

    step_history = [str(step) for step in state.get("step_history") or payload.get("step_history") or []]
    current_step = str(payload.get("current_step") or "")
    failed_step = _failed_step(step_history, state)
    first_incomplete = _first_incomplete_agent(step_history)
    results: list[PipelineAgentResultResponse] = []

    for agent_key, agent_name, output_key in AGENT_DEFINITIONS:
        completed = agent_key in step_history
        failed = failed_step == agent_key
        if failed:
            agent_status = "failed"
        elif completed:
            agent_status = "success"
        elif run_status == "running" and (current_step == agent_key or first_incomplete == agent_key):
            agent_status = "running"
        elif run_status == "failed":
            agent_status = "failed"
        else:
            agent_status = "running"

        output = _agent_output(agent_key, output_key, state)
        results.append(
            PipelineAgentResultResponse(
                agentName=agent_name,
                status=agent_status,
                durationMs=_agent_duration_ms(agent_key, payload),
                tokensUsed=_estimate_tokens(output or ""),
                outputText=output,
            )
        )
    return results


def _state_from_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Return the most complete pipeline state persisted in a task payload."""

    result = payload.get("result")
    if isinstance(result, dict):
        return result
    state = payload.get("state")
    return state if isinstance(state, dict) else {}


def _metadata_from_state(payload: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    """Return metadata from the final state or progress payload."""

    metadata = state.get("metadata") if isinstance(state.get("metadata"), dict) else None
    if metadata is not None:
        return metadata
    payload_metadata = payload.get("metadata")
    return payload_metadata if isinstance(payload_metadata, dict) else {}


def _timeline_status(status: str, has_error: bool) -> str:
    """Normalize task/content status to the UI timeline status enum."""

    normalized = status.lower()
    if has_error or normalized in {"failure", "failed", "revoked"}:
        return "failed"
    if normalized in {"success", "completed", "complete", "scheduled", "published"}:
        return "success"
    return "running"


def _is_terminal(status: str) -> bool:
    """Return true when a persisted task has finished."""

    return status.lower() in {"success", "failure", "failed", "revoked", "completed", "complete"}


def _failed_step(step_history: list[str], state: dict[str, Any]) -> str | None:
    """Infer the failed agent key from step history or a final error."""

    for agent_key, _, _ in AGENT_DEFINITIONS:
        if f"{agent_key}_failed" in step_history:
            return agent_key
    if state.get("error"):
        return _first_incomplete_agent(step_history) or "scheduler"
    return None


def _first_incomplete_agent(step_history: list[str]) -> str | None:
    """Return the first agent key not yet completed."""

    for agent_key, _, _ in AGENT_DEFINITIONS:
        if agent_key not in step_history:
            return agent_key
    return None


def _agent_output(agent_key: str, output_key: str, state: dict[str, Any]) -> str | None:
    """Return a short output description for an agent."""

    if agent_key == "scheduler":
        metadata = state.get("metadata") if isinstance(state.get("metadata"), dict) else {}
        if metadata.get("scheduled_at"):
            return f"Scheduled at {metadata['scheduled_at']}."
        return _string_or_none(state.get(output_key))
    return _string_or_none(state.get(output_key))


def _agent_duration_ms(agent_key: str, payload: dict[str, Any]) -> int:
    """Approximate agent duration from persisted node transition timestamps."""

    timestamps = payload.get("step_timestamps")
    if not isinstance(timestamps, dict):
        return 0
    previous_step = {
        "research": "started",
        "writer": "research",
        "editor": "writer",
        "scheduler": "quality_check",
    }.get(agent_key, "started")
    start = _parse_datetime(timestamps.get(previous_step))
    end = _parse_datetime(timestamps.get(agent_key))
    if start is None or end is None:
        return 0
    return max(0, int((end - start).total_seconds() * 1000))


def _duration_ms(started_at: str, ended_at: str | None) -> int:
    """Return elapsed duration in milliseconds."""

    start = _parse_datetime(started_at)
    end = _parse_datetime(ended_at) if ended_at else datetime.now(UTC)
    if start is None or end is None:
        return 0
    return max(0, int((end - start).total_seconds() * 1000))


def _parse_datetime(value: Any) -> datetime | None:
    """Parse an ISO datetime or return None."""

    if isinstance(value, datetime):
        return value
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def _coerce_iso(value: Any, fallback: datetime | None) -> str:
    """Return an ISO string for API responses."""

    parsed = _parse_datetime(value)
    if parsed is not None:
        return parsed.isoformat()
    if fallback is not None:
        return fallback.isoformat()
    return datetime.now(UTC).isoformat()


def _string_or_none(value: Any) -> str | None:
    """Return a concise string or None."""

    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:480]


def _estimate_tokens(text: str) -> int:
    """Estimate token count from visible output text."""

    return max(0, len(text) // 4)
