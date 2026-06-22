"""Tavily search wrapper."""

from typing import Any

import httpx

from app.config import settings
from app.utils.logger import get_logger

try:
    from langchain_community.tools import TavilySearchResults
except ImportError:  # pragma: no cover - exercised only when dependency is absent
    TavilySearchResults = None  # type: ignore[assignment]


class TavilySearchTool:
    """Async wrapper around LangChain's Tavily search tool."""

    def __init__(self, max_results: int | None = None) -> None:
        """Create a Tavily search tool."""

        self.max_results = max_results or settings.MAX_RESEARCH_SOURCES
        self.logger = get_logger("search_tool")
        self.tool = self._build_tool()

    def _build_tool(self) -> Any:
        """Build the LangChain Tavily tool instance."""

        if TavilySearchResults is None:
            raise RuntimeError("langchain_community TavilySearchResults is unavailable")
        try:
            return TavilySearchResults(
                max_results=self.max_results,
                tavily_api_key=settings.TAVILY_API_KEY,
            )
        except TypeError:
            return TavilySearchResults(max_results=self.max_results)

    async def search(self, query: str) -> list[dict[str, str | float]]:
        """Search Tavily and normalize results to url/content/score dictionaries."""

        try:
            raw_results = await self.tool.ainvoke(query)
        except httpx.HTTPError as exc:
            self.logger.error("tavily_http_failed", query=query, error=str(exc))
            return []
        except Exception as exc:
            self.logger.error("tavily_search_failed", query=query, error=str(exc))
            return []

        if isinstance(raw_results, dict):
            results = raw_results.get("results", [])
        else:
            results = raw_results

        normalized: list[dict[str, str | float]] = []
        for item in results[: self.max_results]:
            if not isinstance(item, dict):
                continue
            url = str(item.get("url", ""))
            content = str(item.get("content") or item.get("snippet") or "")
            score_value = item.get("score", 0.0)
            try:
                score = float(score_value)
            except (TypeError, ValueError):
                score = 0.0
            if url or content:
                normalized.append({"url": url, "content": content, "score": score})
        return normalized
