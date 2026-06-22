"""Editor agent for quality passes and scoring."""

import json
import re
from typing import Any

from app.agents.base_agent import BaseAgent
from app.models.pipeline_state import PipelineState

PROMPTS = {
    "grammar": (
        "Edit the article for grammar, clarity, sentence precision, and factual "
        "readability. Return only the improved article.\n\nArticle:\n{content}"
    ),
    "structure": (
        "Improve the article's structure and flow. Strengthen section transitions, "
        "remove repetition, and preserve the original meaning. Return only the improved article.\n\n"
        "Article:\n{content}"
    ),
    "seo": (
        "Optimize the article for SEO while keeping it natural and useful. Improve "
        "keyword placement, headings, and search intent coverage. End with a single "
        "line formatted as 'Meta Description: <description>'.\n\nTopic: {topic}\n\nArticle:\n{content}"
    ),
    "score": (
        "Score this article from 1 to 10 for readability, SEO, and engagement. "
        "Return only JSON with keys readability_score, seo_score, engagement_score.\n\n"
        "Article:\n{content}"
    ),
    "rewrite": (
        "Rewrite this article to address weak editorial scores. Improve clarity, "
        "search usefulness, and engagement while preserving factual claims. Return only the article.\n\n"
        "Scores: {scores}\n\nArticle:\n{content}"
    ),
}


class EditorAgent(BaseAgent):
    """Agent responsible for multi-pass editing, SEO, and quality scoring."""

    def __init__(
        self,
        llm: Any | None = None,
        memory: Any | None = None,
        logger: Any | None = None,
    ) -> None:
        """Initialize an editor agent."""

        super().__init__(
            agent_name="editor_agent",
            role="Managing Editor",
            goal="Refine drafts into polished, high-quality, SEO-aware articles.",
            backstory="A senior editor with strong standards for clarity, flow, and search quality.",
            llm=llm,
            memory=memory,
            logger=logger,
        )

    async def run(self, state: PipelineState) -> PipelineState:
        """Run grammar, structure, SEO, scoring, and bounded rewrite passes."""

        async def operation() -> PipelineState:
            try:
                content = state.get("draft_content", "")
                content = await self._call_llm(PROMPTS["grammar"].format(content=content))
                content = await self._call_llm(PROMPTS["structure"].format(content=content))
                seo_output = await self._call_llm(
                    PROMPTS["seo"].format(topic=state["topic"], content=content)
                )
                content, meta_description = self._split_meta_description(seo_output)
                scores = await self._score_content(content)

                retries = 0
                while self._needs_rewrite(scores) and retries < 2:
                    retries += 1
                    rewrite_prompt = PROMPTS["rewrite"].format(
                        scores=json.dumps(scores),
                        content=content,
                    )
                    content = await self._call_llm(rewrite_prompt)
                    scores = await self._score_content(content)

                metadata = dict(state.get("metadata", {}))
                metadata.update(scores)
                metadata["meta_description"] = meta_description
                metadata["editor_retries"] = retries
                metadata["word_count"] = len(re.findall(r"\b[\w'-]+\b", content))
                state["metadata"] = metadata
                state["edited_content"] = content
                state["step_history"].append("editor")
                await self._save_to_memory(f"edited:{state['topic']}", content)
            except Exception as exc:
                self.logger.error(
                    "editor_agent_failed",
                    agent_name=self.agent_name,
                    topic=state.get("topic", ""),
                    step="editor",
                    error=str(exc),
                )
                state["error"] = str(exc)
                state["step_history"].append("editor_failed")
            return state

        return await self._run_with_logging(state, "editor", operation)

    async def _score_content(self, content: str) -> dict[str, float]:
        """Return readability, SEO, and engagement scores for content."""

        response = await self._call_llm(PROMPTS["score"].format(content=content))
        return self._parse_scores(response)

    def _parse_scores(self, response: str) -> dict[str, float]:
        """Parse editor scores from JSON or a text fallback."""

        defaults = {
            "readability_score": 7.0,
            "seo_score": 7.0,
            "engagement_score": 7.0,
        }
        try:
            parsed = json.loads(response)
            if isinstance(parsed, dict):
                return {
                    key: float(parsed.get(key, defaults[key]))
                    for key in defaults
                }
        except (json.JSONDecodeError, TypeError, ValueError):
            pass

        scores = defaults.copy()
        for key in defaults:
            match = re.search(rf"{key}\D+(\d+(?:\.\d+)?)", response, re.IGNORECASE)
            if match:
                scores[key] = float(match.group(1))
        return scores

    def _needs_rewrite(self, scores: dict[str, float]) -> bool:
        """Return true when any quality score is below the acceptance threshold."""

        return any(value < 6 for value in scores.values())

    def _split_meta_description(self, content: str) -> tuple[str, str]:
        """Split an SEO output into article body and meta description."""

        match = re.search(r"Meta Description:\s*(.+)$", content, re.IGNORECASE | re.DOTALL)
        if not match:
            return content.strip(), ""
        article = content[: match.start()].strip()
        meta_description = re.sub(r"\s+", " ", match.group(1)).strip()[:320]
        return article, meta_description
