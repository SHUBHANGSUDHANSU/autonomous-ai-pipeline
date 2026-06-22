"""Writer agent for drafting full-form content."""

import math
import re
from collections import Counter
from typing import Any

from app.agents.base_agent import BaseAgent
from app.models.pipeline_state import PipelineState

PROMPTS = {
    "draft": (
        "You are an expert content writer. Using the research provided, write a "
        "complete, engaging article on the topic. Structure it with: a compelling "
        "headline, introduction, 3-5 main sections with subheadings, key takeaways, "
        "and a conclusion. Target: 800-1200 words. Tone: professional yet accessible.\n\n"
        "Topic: {topic}\n\nResearch brief:\n{research}"
    ),
}


class WriterAgent(BaseAgent):
    """Agent responsible for drafting structured articles from research briefs."""

    def __init__(
        self,
        llm: Any | None = None,
        memory: Any | None = None,
        logger: Any | None = None,
    ) -> None:
        """Initialize a writer agent."""

        super().__init__(
            agent_name="writer_agent",
            role="Content Writer",
            goal="Convert research briefs into complete, accessible articles.",
            backstory="An experienced editorial writer focused on clarity and usefulness.",
            llm=llm,
            memory=memory,
            logger=logger,
        )

    async def run(self, state: PipelineState) -> PipelineState:
        """Draft content and populate article metadata."""

        async def operation() -> PipelineState:
            try:
                prompt = PROMPTS["draft"].format(
                    topic=state["topic"],
                    research=state.get("summarized_research", ""),
                )
                draft = await self._call_llm(prompt)
                state["draft_content"] = draft
                metadata = dict(state.get("metadata", {}))
                metadata.update(self._extract_metadata(draft, state["topic"]))
                state["metadata"] = metadata
                state["step_history"].append("writer")
                await self._save_to_memory(f"draft:{state['topic']}", draft)
            except Exception as exc:
                self.logger.error(
                    "writer_agent_failed",
                    agent_name=self.agent_name,
                    topic=state.get("topic", ""),
                    step="writer",
                    error=str(exc),
                )
                state["error"] = str(exc)
                state["step_history"].append("writer_failed")
            return state

        return await self._run_with_logging(state, "writer", operation)

    def _extract_metadata(self, draft: str, topic: str) -> dict[str, Any]:
        """Extract title, read time, word count, and tags from a draft."""

        words = re.findall(r"\b[\w'-]+\b", draft)
        word_count = len(words)
        title = self._extract_title(draft, topic)
        tags = self._suggest_tags(topic, draft)
        estimated_read_time = max(1, math.ceil(word_count / 200))
        return {
            "title": title,
            "word_count": word_count,
            "estimated_read_time_minutes": estimated_read_time,
            "tags": tags,
        }

    def _extract_title(self, draft: str, topic: str) -> str:
        """Extract a headline from the first useful line of the draft."""

        for line in draft.splitlines():
            cleaned = line.strip().lstrip("#").strip()
            if cleaned:
                return cleaned[:500]
        return topic.title()

    def _suggest_tags(self, topic: str, draft: str) -> list[str]:
        """Suggest five tags using topic words and frequent draft terms."""

        stop_words = {
            "about",
            "after",
            "also",
            "and",
            "are",
            "for",
            "from",
            "has",
            "into",
            "the",
            "this",
            "that",
            "with",
            "your",
        }
        candidates = [
            word.lower()
            for word in re.findall(r"\b[a-zA-Z][a-zA-Z-]{3,}\b", f"{topic} {draft}")
            if word.lower() not in stop_words
        ]
        ordered = [word for word, _ in Counter(candidates).most_common()]
        tags: list[str] = []
        for word in ordered:
            if word not in tags:
                tags.append(word)
            if len(tags) == 5:
                break
        while len(tags) < 5:
            tags.append(f"tag-{len(tags) + 1}")
        return tags
