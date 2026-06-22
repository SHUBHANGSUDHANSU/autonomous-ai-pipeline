"""Generated content API routes."""

import inspect
import json
import re
import uuid
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.config import settings
from app.models.content import Content
from app.utils.logger import get_logger
from app.utils.retry import async_retry

router = APIRouter(prefix="/content", tags=["content"])
logger = get_logger("content_api")

RegenerateAction = Literal[
    "regenerate_title",
    "rewrite_intro",
    "improve_seo",
    "professional_tone",
    "shorten_article",
    "expand_article",
]

PROMPTS = {
    "regenerate_title": (
        "You are a senior content strategist. Create a stronger headline for the article. "
        "Keep it accurate, specific, and under 90 characters. Return only JSON with this "
        "shape: {\"title\":\"...\"}.\n\nTopic: {topic}\nCurrent title: {title}\n\nArticle:\n{body}"
    ),
    "rewrite_intro": (
        "You are an expert editor. Rewrite only the article introduction so it is sharper, "
        "more engaging, and more useful to the reader. Preserve all factual claims and keep "
        "the rest of the article intact. Return only JSON with this shape: "
        "{\"body\":\"full updated article body\",\"meta_description\":\"optional updated meta description\"}.\n\n"
        "Topic: {topic}\nTitle: {title}\nCurrent meta description: {meta_description}\n\nArticle:\n{body}"
    ),
    "improve_seo": (
        "You are an SEO editor. Improve this article for search intent, headings, natural "
        "keyword coverage, internal clarity, and snippet quality without keyword stuffing. "
        "Return only JSON with this shape: {\"title\":\"optional improved title\","
        "\"body\":\"full updated article body\",\"meta_description\":\"150-160 character meta description\","
        "\"tags\":[\"tag1\",\"tag2\",\"tag3\",\"tag4\",\"tag5\"]}.\n\n"
        "Topic: {topic}\nTitle: {title}\nCurrent meta description: {meta_description}\n\nArticle:\n{body}"
    ),
    "professional_tone": (
        "You are a managing editor. Rewrite the article in a more professional, credible, "
        "and polished tone while keeping it accessible. Preserve structure, facts, and useful "
        "examples. Return only JSON with this shape: {\"body\":\"full updated article body\","
        "\"meta_description\":\"optional updated meta description\"}.\n\n"
        "Topic: {topic}\nTitle: {title}\nCurrent meta description: {meta_description}\n\nArticle:\n{body}"
    ),
    "shorten_article": (
        "You are a concise technical editor. Shorten this article by about 30 percent while "
        "keeping the strongest claims, key takeaways, headings, and conclusion. Remove filler "
        "and repetition. Return only JSON with this shape: {\"body\":\"full shortened article body\","
        "\"meta_description\":\"optional updated meta description\"}.\n\n"
        "Topic: {topic}\nTitle: {title}\nCurrent meta description: {meta_description}\n\nArticle:\n{body}"
    ),
    "expand_article": (
        "You are an expert content writer. Expand this article with more depth, examples, "
        "context, and practical implications. Keep the tone professional and do not invent "
        "unsupported statistics. Return only JSON with this shape: {\"body\":\"full expanded article body\","
        "\"meta_description\":\"optional updated meta description\"}.\n\n"
        "Topic: {topic}\nTitle: {title}\nCurrent meta description: {meta_description}\n\nArticle:\n{body}"
    ),
    "score": (
        "Score this article from 1 to 10 for readability, SEO, and engagement. Return only "
        "JSON with keys readability_score, seo_score, engagement_score.\n\nArticle:\n{body}"
    ),
}


class ContentResponse(BaseModel):
    """Serialized content record."""

    id: uuid.UUID
    topic: str
    title: str
    body: str
    tags: list[str]
    word_count: int
    readability_score: float
    seo_score: float
    engagement_score: float
    meta_description: str
    publish_status: str
    scheduled_at: datetime | None
    published_at: datetime | None
    created_at: datetime | None
    celery_task_id: str | None

    model_config = ConfigDict(from_attributes=True)


class ContentListResponse(BaseModel):
    """Paginated content list response."""

    total: int
    limit: int
    offset: int
    items: list[ContentResponse]


class DeleteContentResponse(BaseModel):
    """Soft-delete response."""

    content_id: uuid.UUID
    status: str


class RegenerateContentRequest(BaseModel):
    """Request body for focused AI article regeneration."""

    action: RegenerateAction


@router.get("", response_model=ContentListResponse)
async def list_content(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
) -> ContentListResponse:
    """Return paginated content records."""

    filters = []
    if status_filter:
        filters.append(Content.publish_status == status_filter)

    count_stmt = select(func.count()).select_from(Content).where(*filters)
    total = int((await db.execute(count_stmt)).scalar_one())

    stmt = (
        select(Content)
        .where(*filters)
        .order_by(Content.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return ContentListResponse(total=total, limit=limit, offset=offset, items=list(rows))


@router.get("/{content_id}", response_model=ContentResponse)
async def get_content(
    content_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
) -> Content:
    """Return a single content record by id."""

    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    return content


@router.delete("/{content_id}", response_model=DeleteContentResponse)
async def delete_content(
    content_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
) -> DeleteContentResponse:
    """Soft delete a content record by setting publish_status to deleted."""

    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    content.publish_status = "deleted"
    await db.commit()
    return DeleteContentResponse(content_id=content_id, status="deleted")


@router.post("/{content_id}/regenerate", response_model=ContentResponse)
async def regenerate_content(
    content_id: uuid.UUID,
    request: RegenerateContentRequest,
    db: AsyncSession = Depends(get_db_session),
) -> Content:
    """Run a focused AI edit against a saved article and persist the result."""

    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    started_word_count = content.word_count
    try:
        update = await _generate_content_update(content, request.action)
        _apply_content_update(content, request.action, update)
        if request.action != "regenerate_title":
            scores = await _score_article(content.body)
            content.readability_score = scores["readability_score"]
            content.seo_score = scores["seo_score"]
            content.engagement_score = scores["engagement_score"]
    except Exception as exc:
        logger.exception(
            "content_regeneration_failed",
            content_id=str(content_id),
            action=request.action,
            error=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI regeneration failed. Please try again.",
        ) from exc

    await db.commit()
    logger.info(
        "content_regenerated",
        content_id=str(content_id),
        action=request.action,
        previous_word_count=started_word_count,
        word_count=content.word_count,
    )
    return content


async def _generate_content_update(
    content: Content,
    action: RegenerateAction,
) -> dict[str, Any]:
    """Ask the LLM for a focused article update."""

    prompt = PROMPTS[action].format(
        topic=content.topic,
        title=content.title,
        body=content.body,
        meta_description=content.meta_description,
    )
    response = await _call_llm(prompt)
    return _parse_update_response(response, action)


def _apply_content_update(
    content: Content,
    action: RegenerateAction,
    update: dict[str, Any],
) -> None:
    """Apply an LLM update payload to a content record."""

    title = _clean_optional_text(update.get("title"))
    body = _clean_body_text(update.get("body"))
    meta_description = _clean_optional_text(update.get("meta_description"))
    tags = update.get("tags")

    if title:
        content.title = title[:500]

    if action != "regenerate_title":
        if not body:
            raise ValueError("Regeneration response did not include an article body")
        content.body = body
        content.word_count = _word_count(body)

    if meta_description:
        content.meta_description = meta_description[:320]

    if isinstance(tags, list):
        cleaned_tags = [
            _clean_optional_text(tag)[:40]
            for tag in tags
            if _clean_optional_text(tag)
        ]
        if cleaned_tags:
            content.tags = cleaned_tags[:8]


async def _score_article(body: str) -> dict[str, float]:
    """Return editor quality scores for an article body."""

    response = await _call_llm(PROMPTS["score"].format(body=body))
    parsed = _parse_json_object(response)
    if parsed:
        return {
            "readability_score": _clamp_score(parsed.get("readability_score")),
            "seo_score": _clamp_score(parsed.get("seo_score")),
            "engagement_score": _clamp_score(parsed.get("engagement_score")),
        }

    scores = {
        "readability_score": 7.0,
        "seo_score": 7.0,
        "engagement_score": 7.0,
    }
    for key in scores:
        match = re.search(rf"{key}\D+(\d+(?:\.\d+)?)", response, re.IGNORECASE)
        if match:
            scores[key] = _clamp_score(match.group(1))
    return scores


def _parse_update_response(response: str, action: RegenerateAction) -> dict[str, Any]:
    """Parse an LLM update response with a text fallback."""

    parsed = _parse_json_object(response)
    if parsed is not None:
        return parsed

    cleaned = response.strip()
    if action == "regenerate_title":
        return {"title": cleaned.splitlines()[0].strip(" \"'")}
    return {"body": cleaned}


def _parse_json_object(response: str) -> dict[str, Any] | None:
    """Parse a JSON object from plain text or fenced markdown."""

    cleaned = response.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    try:
        parsed = json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


@async_retry(retries=3, initial_delay=1.0, max_delay=30.0)
async def _call_llm(prompt: str) -> str:
    """Call Groq through LangChain with retry/backoff."""

    llm = _build_llm()
    if hasattr(llm, "ainvoke"):
        response = await llm.ainvoke(prompt)
    elif hasattr(llm, "invoke"):
        maybe_response = llm.invoke(prompt)
        response = await maybe_response if inspect.isawaitable(maybe_response) else maybe_response
    else:
        raise TypeError("Configured LLM does not expose an invoke method")

    content = getattr(response, "content", response)
    if isinstance(content, list):
        return "\n".join(str(part) for part in content)
    return str(content)


def _build_llm() -> Any:
    """Build a Groq-backed chat model for regeneration actions."""

    from langchain_groq import ChatGroq

    try:
        return ChatGroq(
            model=settings.GROQ_MODEL,
            api_key=settings.GROQ_API_KEY,
            temperature=0.35,
        )
    except TypeError:
        return ChatGroq(
            model_name=settings.GROQ_MODEL,
            groq_api_key=settings.GROQ_API_KEY,
            temperature=0.35,
        )


def _clean_optional_text(value: Any) -> str:
    """Return a normalized string value."""

    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def _clean_body_text(value: Any) -> str:
    """Return article body text while preserving paragraph structure."""

    if value is None:
        return ""
    text = str(value).strip()
    text = re.sub(r"^```(?:markdown|md|text)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _word_count(body: str) -> int:
    """Count article words consistently with the editor agent."""

    return len(re.findall(r"\b[\w'-]+\b", body))


def _clamp_score(value: Any) -> float:
    """Clamp an LLM score into the editor score range."""

    try:
        number = float(value)
    except (TypeError, ValueError):
        number = 7.0
    return max(1.0, min(10.0, round(number, 2)))
