"""Celery task definitions for pipeline execution and publishing."""

import asyncio
import inspect
import uuid
from datetime import UTC, datetime
from typing import Any

from celery import Celery, current_task
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.db.session import get_session_context
from app.models.content import Content
from app.models.pipeline_state import PipelineState
from app.models.task import PipelineTask
from app.tools.memory_tool import RedisMemory
from app.utils.logger import get_logger

celery_app = Celery(
    "autonomous_ai_pipeline",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "scheduled-pipeline-beat": {
            "task": "app.tasks.celery_tasks.scheduled_pipeline_beat",
            "schedule": settings.CONTENT_PUBLISH_INTERVAL_HOURS * 60 * 60,
        }
    },
)

logger = get_logger("celery_tasks")


@celery_app.task(name="app.tasks.celery_tasks.run_pipeline_task")
def run_pipeline_task(topic: str) -> dict[str, Any]:
    """Run the autonomous pipeline inside a Celery worker."""

    from app.agents import orchestrator

    task_id = _current_task_id()
    logger.info("run_pipeline_task_started", topic=topic)
    asyncio.run(
        _record_pipeline_task(
            task_id,
            topic,
            "running",
            payload={"started_at": datetime.now(UTC).isoformat(), "current_step": "started"},
        )
    )
    progress_callback = _build_progress_callback(task_id, topic)
    run_pipeline = orchestrator.run_pipeline
    if "progress_callback" in inspect.signature(run_pipeline).parameters:
        result = asyncio.run(run_pipeline(topic, progress_callback=progress_callback))
    else:
        result = asyncio.run(run_pipeline(topic))
    final_status = "failure" if result.get("error") else "success"
    asyncio.run(
        _record_pipeline_task(
            task_id,
            topic,
            final_status,
            payload={"result": dict(result), "ended_at": datetime.now(UTC).isoformat()},
            error=str(result.get("error")) if result.get("error") else None,
        )
    )
    logger.info(
        "run_pipeline_task_completed",
        topic=topic,
        publish_status=result.get("publish_status"),
        error=result.get("error"),
    )
    return dict(result)


def _current_task_id() -> str | None:
    """Return the active Celery task id when running inside a worker."""

    request = getattr(current_task, "request", None)
    task_id = getattr(request, "id", None)
    return str(task_id) if task_id else None


def _build_progress_callback(task_id: str | None, topic: str) -> Any:
    """Build an async callback that records node-level LangGraph progress."""

    async def _progress(state: PipelineState, step: str) -> None:
        payload = {
            "current_step": step,
            "state": dict(state),
            "step_history": list(state.get("step_history", [])),
            "metadata": dict(state.get("metadata", {})),
            "publish_status": state.get("publish_status"),
            "updated_at": datetime.now(UTC).isoformat(),
        }
        await _record_pipeline_task(task_id, topic, "running", payload=payload)

    return _progress


async def _record_pipeline_task(
    celery_task_id: str | None,
    topic: str,
    status: str,
    payload: dict[str, Any] | None = None,
    error: str | None = None,
) -> None:
    """Create or update the persisted task record used by the UI timeline."""

    if not celery_task_id:
        return
    if settings.ENVIRONMENT == "test":
        return
    try:
        async with get_session_context() as session:
            result = await session.execute(
                select(PipelineTask).where(PipelineTask.celery_task_id == celery_task_id)
            )
            task = result.scalar_one_or_none()
            if task is None:
                task = PipelineTask(
                    celery_task_id=celery_task_id,
                    topic=topic,
                    status=status,
                    payload={},
                )
                session.add(task)
            task.topic = topic
            task.status = status
            task.error = error
            if payload:
                merged_payload = dict(task.payload or {})
                merged_payload.update(payload)
                current_step = payload.get("current_step")
                if current_step:
                    step_timestamps = dict(merged_payload.get("step_timestamps") or {})
                    step_timestamps.setdefault(str(current_step), datetime.now(UTC).isoformat())
                    merged_payload["step_timestamps"] = step_timestamps
                task.payload = merged_payload
            await session.commit()
    except SQLAlchemyError as exc:
        logger.warning(
            "pipeline_task_record_failed",
            topic=topic,
            celery_task_id=celery_task_id,
            status=status,
            error=str(exc),
        )


@celery_app.task(name="app.tasks.celery_tasks.publish_content_task")
def publish_content_task(content_id: str) -> dict[str, str]:
    """Mark scheduled content as published."""

    async def _publish() -> dict[str, str]:
        try:
            async with get_session_context() as session:
                result = await session.execute(
                    select(Content).where(Content.id == uuid.UUID(content_id))
                )
                content = result.scalar_one_or_none()
                if content is None:
                    return {"content_id": content_id, "status": "not_found"}
                content.publish_status = "published"
                content.published_at = datetime.now(UTC)
                await session.commit()
                return {"content_id": content_id, "status": "published"}
        except SQLAlchemyError as exc:
            logger.error("publish_content_db_failed", content_id=content_id, error=str(exc))
            raise

    return asyncio.run(_publish())


@celery_app.task(name="app.tasks.celery_tasks.scheduled_pipeline_beat")
def scheduled_pipeline_beat() -> dict[str, Any]:
    """Pop one topic from Redis and enqueue a pipeline run."""

    async def _check_topic_queue() -> dict[str, Any]:
        memory = RedisMemory()
        try:
            topic = await memory.client.lpop("pipeline:topic_queue")
            if not topic:
                return {"status": "empty"}
            task = run_pipeline_task.delay(str(topic))
            return {"status": "queued", "topic": str(topic), "task_id": str(task.id)}
        except RedisError as exc:
            logger.error("scheduled_pipeline_beat_redis_failed", error=str(exc))
            raise
        finally:
            await memory.close()

    return asyncio.run(_check_topic_queue())
