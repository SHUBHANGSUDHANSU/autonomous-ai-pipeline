"""Research agent for web discovery and synthesis."""

import json
import re
from typing import Any

from app.agents.base_agent import BaseAgent
from app.config import settings
from app.models.pipeline_state import PipelineState
from app.tools.scrape_tool import ScrapeTool
from app.tools.search_tool import TavilySearchTool

PROMPTS = {
    "queries": (
        "Generate exactly 3 targeted web search queries for this content topic. "
        "Return only a JSON array of strings.\n\nTopic: {topic}"
    ),
    "summarize": (
        "You are a professional research analyst. Synthesize the following web "
        "content into a structured research brief with: key facts, main arguments, "
        "relevant statistics, and source credibility notes. Be concise and factual.\n\n"
        "Topic: {topic}\n\nWeb content:\n{content}"
    ),
}


class ResearchAgent(BaseAgent):
    """Agent responsible for search, scraping, and research synthesis."""

    def __init__(
        self,
        llm: Any | None = None,
        memory: Any | None = None,
        search_tool: TavilySearchTool | None = None,
        scrape_tool: ScrapeTool | None = None,
        logger: Any | None = None,
    ) -> None:
        """Initialize a research agent."""

        super().__init__(
            agent_name="research_agent",
            role="Research Analyst",
            goal="Discover credible sources and synthesize factual research briefs.",
            backstory="A meticulous analyst skilled at web research and source triage.",
            llm=llm,
            memory=memory,
            logger=logger,
        )
        self.search_tool = search_tool if search_tool is not None else TavilySearchTool()
        self.scrape_tool = scrape_tool if scrape_tool is not None else ScrapeTool()

    async def run(self, state: PipelineState) -> PipelineState:
        """Generate search queries, gather web content, and summarize research."""

        async def operation() -> PipelineState:
            try:
                topic = state["topic"]
                queries = await self._generate_queries(topic)
                state["search_queries"] = queries

                raw_research: list[dict[str, Any]] = []
                for query in queries:
                    results = await self.search_tool.search(query)
                    for result in results:
                        enriched = dict(result)
                        enriched["query"] = query
                        raw_research.append(enriched)

                for item in raw_research[: settings.MAX_RESEARCH_SOURCES]:
                    url = str(item.get("url", ""))
                    item["scraped_content"] = await self.scrape_tool.scrape(url) if url else ""

                content = self._format_research_for_summary(raw_research)
                summary_prompt = PROMPTS["summarize"].format(topic=topic, content=content)
                state["summarized_research"] = await self._call_llm(summary_prompt)
                state["raw_research"] = raw_research
                state["step_history"].append("research")
                await self._save_to_memory(f"research:{topic}", state["summarized_research"])
            except Exception as exc:
                self.logger.error(
                    "research_agent_failed",
                    agent_name=self.agent_name,
                    topic=state.get("topic", ""),
                    step="research",
                    error=str(exc),
                )
                state["error"] = str(exc)
                state["step_history"].append("research_failed")
            return state

        return await self._run_with_logging(state, "research", operation)

    async def _generate_queries(self, topic: str) -> list[str]:
        """Generate three search queries for a topic."""

        response = await self._call_llm(PROMPTS["queries"].format(topic=topic))
        queries = self._parse_queries(response)
        if len(queries) < 3:
            queries.extend(
                [
                    f"{topic} latest research",
                    f"{topic} statistics and trends",
                    f"{topic} expert analysis",
                ]
            )
        return queries[:3]

    def _parse_queries(self, response: str) -> list[str]:
        """Parse an LLM response into a list of clean search query strings."""

        try:
            parsed = json.loads(response)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        except json.JSONDecodeError:
            pass

        lines = re.split(r"[\n;]", response)
        queries: list[str] = []
        for line in lines:
            cleaned = re.sub(r"^\s*[-*\d.)]+\s*", "", line).strip().strip('"')
            if cleaned:
                queries.append(cleaned)
        return queries

    def _format_research_for_summary(self, raw_research: list[dict[str, Any]]) -> str:
        """Format raw research dictionaries into a compact synthesis context."""

        sections: list[str] = []
        for index, item in enumerate(raw_research, start=1):
            content = item.get("scraped_content") or item.get("content") or ""
            sections.append(
                "\n".join(
                    [
                        f"Source {index}",
                        f"Query: {item.get('query', '')}",
                        f"URL: {item.get('url', '')}",
                        f"Score: {item.get('score', 0)}",
                        f"Content: {content}",
                    ]
                )
            )
        return "\n\n".join(sections)[:12000]
