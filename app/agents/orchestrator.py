"""LangGraph orchestration for the autonomous content pipeline."""

from collections.abc import Awaitable, Callable
from typing import Any

from langgraph.graph import END, START, StateGraph

from app.agents.editor_agent import EditorAgent
from app.agents.research_agent import ResearchAgent
from app.agents.scheduler_agent import SchedulerAgent
from app.agents.writer_agent import WriterAgent
from app.models.pipeline_state import PipelineState
from app.utils.logger import get_logger


def create_initial_state(topic: str) -> PipelineState:
    """Create the initial pipeline state for a topic."""

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


def build_pipeline(
    research_agent: ResearchAgent | None = None,
    writer_agent: WriterAgent | None = None,
    editor_agent: EditorAgent | None = None,
    scheduler_agent: SchedulerAgent | None = None,
    progress_callback: Callable[[PipelineState, str], Awaitable[None]] | None = None,
) -> Any:
    """Build and compile the LangGraph state machine."""

    research = research_agent if research_agent is not None else ResearchAgent()
    writer = writer_agent if writer_agent is not None else WriterAgent()
    editor = editor_agent if editor_agent is not None else EditorAgent()
    scheduler = scheduler_agent if scheduler_agent is not None else SchedulerAgent()

    async def research_node(state: PipelineState) -> PipelineState:
        """Run the research node."""

        updated_state = await research.run(state)
        await _emit_progress(progress_callback, updated_state, "research")
        return updated_state

    async def writer_node(state: PipelineState) -> PipelineState:
        """Run the writer node."""

        updated_state = await writer.run(state)
        await _emit_progress(progress_callback, updated_state, "writer")
        return updated_state

    async def editor_node(state: PipelineState) -> PipelineState:
        """Run the editor node."""

        updated_state = await editor.run(state)
        await _emit_progress(progress_callback, updated_state, "editor")
        return updated_state

    async def scheduler_node(state: PipelineState) -> PipelineState:
        """Run the scheduler node."""

        updated_state = await scheduler.run(state)
        await _emit_progress(progress_callback, updated_state, "scheduler")
        return updated_state

    async def quality_check_node(state: PipelineState) -> PipelineState:
        """Persist a quality decision before conditional routing."""

        if state.get("error"):
            metadata = dict(state.get("metadata", {}))
            metadata["quality_decision"] = "end"
            state["metadata"] = metadata
            await _emit_progress(progress_callback, state, "quality_check")
            return state

        metadata = dict(state.get("metadata", {}))
        scores = [
            float(metadata.get("readability_score") or 0.0),
            float(metadata.get("seo_score") or 0.0),
            float(metadata.get("engagement_score") or 0.0),
        ]
        quality_retries = int(metadata.get("quality_retries") or 0)
        if any(score < 6 for score in scores) and quality_retries < 2:
            metadata["quality_retries"] = quality_retries + 1
            metadata["quality_decision"] = "rewrite"
            state["metadata"] = metadata
            state["step_history"].append("quality_retry")
            await _emit_progress(progress_callback, state, "quality_check")
            return state
        metadata["quality_decision"] = "schedule"
        state["metadata"] = metadata
        await _emit_progress(progress_callback, state, "quality_check")
        return state

    def quality_route(state: PipelineState) -> str:
        """Route based on the persisted quality decision."""

        return str(state.get("metadata", {}).get("quality_decision", "schedule"))

    graph = StateGraph(PipelineState)
    graph.add_node("research_node", research_node)
    graph.add_node("writer_node", writer_node)
    graph.add_node("editor_node", editor_node)
    graph.add_node("quality_check_node", quality_check_node)
    graph.add_node("scheduler_node", scheduler_node)

    graph.add_edge(START, "research_node")
    graph.add_edge("research_node", "writer_node")
    graph.add_edge("writer_node", "editor_node")
    graph.add_edge("editor_node", "quality_check_node")
    graph.add_conditional_edges(
        "quality_check_node",
        quality_route,
        {
            "rewrite": "writer_node",
            "schedule": "scheduler_node",
            "end": END,
        },
    )
    graph.add_edge("scheduler_node", END)
    return graph.compile()


async def run_pipeline(
    topic: str,
    progress_callback: Callable[[PipelineState, str], Awaitable[None]] | None = None,
) -> PipelineState:
    """Run the compiled autonomous pipeline for a topic."""

    logger = get_logger("orchestrator")
    initial_state = create_initial_state(topic)
    logger.info("pipeline_started", topic=topic)
    await _emit_progress(progress_callback, initial_state, "started")
    pipeline = build_pipeline(progress_callback=progress_callback)
    result: PipelineState = await pipeline.ainvoke(initial_state)
    await _emit_progress(progress_callback, result, "completed")
    logger.info(
        "pipeline_completed",
        topic=topic,
        publish_status=result.get("publish_status"),
        error=result.get("error"),
    )
    return result


async def _emit_progress(
    progress_callback: Callable[[PipelineState, str], Awaitable[None]] | None,
    state: PipelineState,
    step: str,
) -> None:
    """Notify an optional progress callback without breaking the pipeline."""

    if progress_callback is None:
        return
    try:
        await progress_callback(dict(state), step)
    except Exception as exc:  # pragma: no cover - progress telemetry must not fail the run
        get_logger("orchestrator").warning(
            "pipeline_progress_callback_failed",
            topic=state.get("topic", ""),
            step=step,
            error=str(exc),
        )
