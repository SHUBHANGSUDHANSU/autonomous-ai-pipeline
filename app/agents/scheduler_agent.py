"""Scheduler agent for persistence and Celery publishing tasks."""

import asyncio
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from celery.exceptions import CeleryError
from sqlalchemy import desc, select
from sqlalchemy.exc import SQLAlchemyError

from app.agents.base_agent import BaseAgent
from app.config import settings
from app.db.session import get_session_context
from app.models.content import Content
from app.models.pipeline_state import PipelineState


class SchedulerAgent(BaseAgent):
    """Agent responsible for saving final content and scheduling publication."""

    def __init__(
        self,
        llm: Any | None = None,
        memory: Any | None = None,
        logger: Any | None = None,
        session_factory: Callable[..., Any] | None = None,
        enqueue_publish: Callable[[str, datetime], str] | None = None,
    ) -> None:
        """Initialize a scheduler agent."""

        super().__init__(
            agent_name="scheduler_agent",
            role="Publishing Scheduler",
            goal="Persist final content and schedule reliable publication jobs.",
            backstory="A production operator focused on queueing, persistence, and delivery.",
            llm=llm,
            memory=memory,
            logger=logger,
        )
        self.session_factory = session_factory if session_factory is not None else get_session_context
        self.enqueue_publish = enqueue_publish if enqueue_publish is not None else self._enqueue_publish

    async def run(self, state: PipelineState) -> PipelineState:
        """Persist edited content and enqueue a publish task."""

        async def operation() -> PipelineState:
            try:
                metadata = dict(state.get("metadata", {}))
                async with self.session_factory() as session:
                    scheduled_at = await self._calculate_publish_time(session)
                    content = Content(
                        topic=state["topic"],
                        title=str(metadata.get("title") or state["topic"].title()),
                        body=state.get("edited_content") or state.get("draft_content", ""),
                        tags=list(metadata.get("tags") or []),
                        word_count=int(metadata.get("word_count") or 0),
                        readability_score=float(metadata.get("readability_score") or 0.0),
                        seo_score=float(metadata.get("seo_score") or 0.0),
                        engagement_score=float(metadata.get("engagement_score") or 0.0),
                        meta_description=str(metadata.get("meta_description") or ""),
                        publish_status="scheduled",
                        scheduled_at=scheduled_at,
                    )
                    session.add(content)
                    await session.commit()
                    await session.refresh(content)
                    task_id = await asyncio.to_thread(
                        self.enqueue_publish,
                        str(content.id),
                        scheduled_at,
                    )
                    content.celery_task_id = task_id
                    await session.commit()

                metadata["content_id"] = str(content.id)
                metadata["scheduled_at"] = scheduled_at.isoformat()
                metadata["celery_task_id"] = task_id
                state["metadata"] = metadata
                state["publish_status"] = "scheduled"
                state["step_history"].append("scheduler")
            except (CeleryError, SQLAlchemyError, ValueError, TypeError) as exc:
                self.logger.error(
                    "scheduler_agent_failed",
                    agent_name=self.agent_name,
                    topic=state.get("topic", ""),
                    step="scheduler",
                    error=str(exc),
                )
                state["error"] = str(exc)
                state["step_history"].append("scheduler_failed")
            return state

        return await self._run_with_logging(state, "scheduler", operation)

    async def _calculate_publish_time(self, session: Any) -> datetime:
        """Calculate the next available publication slot."""

        now = datetime.now(UTC)
        interval = timedelta(hours=settings.CONTENT_PUBLISH_INTERVAL_HOURS)
        try:
            result = await session.execute(
                select(Content.scheduled_at)
                .where(Content.publish_status == "scheduled")
                .order_by(desc(Content.scheduled_at))
                .limit(1)
            )
            latest = result.scalar_one_or_none()
        except Exception as exc:
            self.logger.warning("publish_slot_lookup_failed", error=str(exc))
            latest = None

        if latest is None or latest < now:
            return now + interval
        return latest + interval

    def _enqueue_publish(self, content_id: str, scheduled_at: datetime) -> str:
        """Enqueue the Celery publish task and return its task id."""

        if not content_id:
            raise ValueError("content_id is required")
        try:
            uuid.UUID(content_id)
        except ValueError:
            raise

        from app.tasks.celery_tasks import publish_content_task

        result = publish_content_task.apply_async(args=[content_id], eta=scheduled_at)
        return str(result.id)
