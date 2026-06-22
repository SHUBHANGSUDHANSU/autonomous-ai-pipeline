"""Shared base class for CrewAI-backed pipeline agents."""

import inspect
import time
from abc import ABC, abstractmethod
from typing import Any

from app.config import settings
from app.models.pipeline_state import PipelineState
from app.tools.memory_tool import RedisMemory
from app.utils.logger import get_logger
from app.utils.retry import async_retry


class BaseAgent(ABC):
    """Abstract base class for all autonomous content agents."""

    def __init__(
        self,
        agent_name: str,
        role: str,
        goal: str,
        backstory: str,
        llm: Any | None = None,
        memory: RedisMemory | None = None,
        logger: Any | None = None,
    ) -> None:
        """Initialize shared LLM, Redis memory, logger, and CrewAI role metadata."""

        self.agent_name = agent_name
        self.role = role
        self.goal = goal
        self.backstory = backstory
        self.llm = llm if llm is not None else self._build_llm()
        self.memory = memory if memory is not None else RedisMemory()
        self.logger = logger if logger is not None else get_logger(agent_name)
        self.last_token_count = 0
        self.crew_agent = self._build_crew_agent()

    @abstractmethod
    async def run(self, state: PipelineState) -> PipelineState:
        """Execute the agent against a pipeline state."""

    def _build_llm(self) -> Any:
        """Build the default Groq-backed LangChain chat model."""

        from langchain_groq import ChatGroq

        try:
            return ChatGroq(
                model=settings.GROQ_MODEL,
                api_key=settings.GROQ_API_KEY,
                temperature=0.2,
            )
        except TypeError:
            return ChatGroq(
                model_name=settings.GROQ_MODEL,
                groq_api_key=settings.GROQ_API_KEY,
                temperature=0.2,
            )

    def _build_crew_agent(self) -> Any:
        """Create a CrewAI role object without taking over LangGraph execution.

        The pipeline executes LLM calls through LangChain's ChatGroq so the agent
        graph stays async and testable. CrewAI is still used to model the agent
        roles, but we avoid initializing CrewAI's runtime LLM adapter here because
        its optional Groq LiteLLM dependency currently conflicts with CrewAI's
        pinned OpenAI dependency set.
        """

        try:
            from crewai import Agent as CrewAgent

            return CrewAgent.model_construct(
                role=self.role,
                goal=self.goal,
                backstory=self.backstory,
                allow_delegation=False,
                verbose=False,
            )
        except Exception as exc:
            self.logger.warning(
                "crewai_agent_unavailable",
                agent_name=self.agent_name,
                error=str(exc),
            )
            return {
                "role": self.role,
                "goal": self.goal,
                "backstory": self.backstory,
            }

    async def _call_llm(self, prompt: str) -> str:
        """Call the configured LLM with retry logic and return text content."""

        return await self._call_llm_with_retry(prompt)

    @async_retry(retries=3, initial_delay=1.0, max_delay=30.0)
    async def _call_llm_with_retry(self, prompt: str) -> str:
        """Invoke the LLM once; retry behavior is applied by the decorator."""

        try:
            if hasattr(self.llm, "ainvoke"):
                response = await self.llm.ainvoke(prompt)
            elif hasattr(self.llm, "invoke"):
                maybe_response = self.llm.invoke(prompt)
                response = (
                    await maybe_response
                    if inspect.isawaitable(maybe_response)
                    else maybe_response
                )
            elif callable(self.llm):
                maybe_response = self.llm(prompt)
                response = (
                    await maybe_response
                    if inspect.isawaitable(maybe_response)
                    else maybe_response
                )
            else:
                raise TypeError("Configured llm does not expose an invoke method")
        except Exception:
            self.last_token_count = 0
            raise

        self.last_token_count = self._extract_token_count(response)
        content = getattr(response, "content", response)
        if isinstance(content, list):
            return "\n".join(str(part) for part in content)
        return str(content)

    async def _save_to_memory(self, key: str, value: str) -> None:
        """Persist a value to Redis short-term memory."""

        await self.memory.save(key, value)

    async def _get_from_memory(self, key: str) -> str | None:
        """Retrieve a value from Redis short-term memory."""

        return await self.memory.get(key)

    def _extract_token_count(self, response: Any) -> int:
        """Extract token usage from a LangChain response when available."""

        metadata = getattr(response, "response_metadata", {}) or {}
        usage = metadata.get("token_usage") or metadata.get("usage") or {}
        total_tokens = usage.get("total_tokens") or usage.get("total")
        try:
            return int(total_tokens or 0)
        except (TypeError, ValueError):
            return 0

    async def _run_with_logging(
        self,
        state: PipelineState,
        step: str,
        operation: Any,
    ) -> PipelineState:
        """Run an operation and log structured timing and token metadata."""

        started = time.perf_counter()
        try:
            result = await operation()
            return result
        finally:
            duration_ms = int((time.perf_counter() - started) * 1000)
            self.logger.info(
                "agent_action",
                agent_name=self.agent_name,
                topic=state.get("topic", ""),
                step=step,
                duration_ms=duration_ms,
                token_count=self.last_token_count,
            )
