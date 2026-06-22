"""LangGraph pipeline state schema."""

from typing import TypedDict


class PipelineState(TypedDict):
    """State passed through the autonomous content pipeline graph."""

    topic: str
    search_queries: list[str]
    raw_research: list[dict]
    summarized_research: str
    draft_content: str
    edited_content: str
    metadata: dict
    publish_status: str
    error: str | None
    step_history: list[str]
