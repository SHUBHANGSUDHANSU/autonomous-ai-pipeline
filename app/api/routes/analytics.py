"""Analytics API routes backed by persisted content records."""

import uuid
from collections import Counter
from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.models.content import Content

router = APIRouter(prefix="/analytics", tags=["analytics"])

STATUS_DELETED = "deleted"
STATUS_PUBLISHED = "published"
STATUS_SCHEDULED = "scheduled"
CHART_DAYS = 30
SECONDS_PER_DAY = 86_400


class AnalyticsMetricsResponse(BaseModel):
    """Summary metrics for the analytics dashboard."""

    total_generated: int
    published_count: int
    scheduled_count: int
    published_rate: float
    avg_seo_score: float
    avg_readability_score: float
    avg_engagement_score: float
    avg_word_count: int
    total_words: int
    this_week_count: int


class AnalyticsChartPointResponse(BaseModel):
    """Daily generated-article count for charting."""

    date: str
    articles: int
    cumulative: int


class AnalyticsScorePointResponse(BaseModel):
    """Normalized quality score chart point."""

    metric: str
    value: float


class AnalyticsTopicResponse(BaseModel):
    """Topic count chart point."""

    topic: str
    count: int


class AnalyticsTopArticleResponse(BaseModel):
    """Top article row for the analytics dashboard."""

    id: uuid.UUID
    topic: str
    title: str
    status: str
    word_count: int
    readability_score: float
    seo_score: float
    engagement_score: float
    composite_score: float
    published_at: datetime | None
    created_at: datetime | None


class AnalyticsResponse(BaseModel):
    """Complete analytics dashboard response."""

    generated_at: datetime
    metrics: AnalyticsMetricsResponse
    articles_over_time: list[AnalyticsChartPointResponse]
    average_scores: list[AnalyticsScorePointResponse]
    top_topics: list[AnalyticsTopicResponse]
    top_articles: list[AnalyticsTopArticleResponse]


@router.get("", response_model=AnalyticsResponse)
async def get_analytics(db: AsyncSession = Depends(get_db_session)) -> AnalyticsResponse:
    """Return analytics calculated from real persisted content records."""

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Content)
        .where(Content.publish_status != STATUS_DELETED)
        .order_by(Content.created_at.asc())
    )
    content = list(result.scalars().all())

    metrics = _build_metrics(content, now)
    return AnalyticsResponse(
        generated_at=now,
        metrics=metrics,
        articles_over_time=_build_articles_over_time(content, now),
        average_scores=_build_average_scores(metrics),
        top_topics=_build_top_topics(content),
        top_articles=_build_top_articles(content),
    )


def _build_metrics(content: list[Content], now: datetime) -> AnalyticsMetricsResponse:
    """Calculate summary metrics from content records."""

    total_generated = len(content)
    published_count = sum(1 for item in content if item.publish_status == STATUS_PUBLISHED)
    scheduled_count = sum(1 for item in content if item.publish_status == STATUS_SCHEDULED)
    total_words = sum(int(item.word_count or 0) for item in content)
    week_start = now - timedelta(days=7)
    this_week_count = sum(
        1
        for item in content
        if (created_at := _as_utc(item.created_at)) is not None and created_at >= week_start
    )

    return AnalyticsMetricsResponse(
        total_generated=total_generated,
        published_count=published_count,
        scheduled_count=scheduled_count,
        published_rate=_round_score((published_count / total_generated) * 100 if total_generated else 0),
        avg_seo_score=_average([item.seo_score for item in content]),
        avg_readability_score=_average([item.readability_score for item in content]),
        avg_engagement_score=_average([item.engagement_score for item in content]),
        avg_word_count=round(total_words / total_generated) if total_generated else 0,
        total_words=total_words,
        this_week_count=this_week_count,
    )


def _build_articles_over_time(
    content: list[Content],
    now: datetime,
) -> list[AnalyticsChartPointResponse]:
    """Build a 30-day generated-article series from created_at timestamps."""

    end_date = now.date()
    start_date = end_date - timedelta(days=CHART_DAYS - 1)
    start_datetime = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    counts = {start_date + timedelta(days=index): 0 for index in range(CHART_DAYS)}
    cumulative = 0

    for item in content:
        created_at = _as_utc(item.created_at)
        if created_at is None:
            continue
        if created_at < start_datetime:
            cumulative += 1
            continue
        created_date = created_at.date()
        if created_date in counts:
            counts[created_date] += 1

    points: list[AnalyticsChartPointResponse] = []
    for day, count in counts.items():
        cumulative += count
        points.append(
            AnalyticsChartPointResponse(
                date=day.isoformat(),
                articles=count,
                cumulative=cumulative,
            )
        )
    return points


def _build_average_scores(metrics: AnalyticsMetricsResponse) -> list[AnalyticsScorePointResponse]:
    """Build normalized score values for the radar chart."""

    normalized_word_count = min(10.0, metrics.avg_word_count / 120) if metrics.avg_word_count else 0.0
    return [
        AnalyticsScorePointResponse(metric="SEO", value=metrics.avg_seo_score),
        AnalyticsScorePointResponse(metric="Readability", value=metrics.avg_readability_score),
        AnalyticsScorePointResponse(metric="Engagement", value=metrics.avg_engagement_score),
        AnalyticsScorePointResponse(metric="Word Count", value=_round_score(normalized_word_count)),
    ]


def _build_top_topics(content: list[Content]) -> list[AnalyticsTopicResponse]:
    """Return the ten most common content topics."""

    counts = Counter(_clean_topic(item.topic) for item in content)
    return [
        AnalyticsTopicResponse(topic=topic, count=count)
        for topic, count in counts.most_common(10)
    ]


def _build_top_articles(content: list[Content]) -> list[AnalyticsTopArticleResponse]:
    """Return articles sorted by composite quality score."""

    sorted_content = sorted(content, key=_composite_score, reverse=True)[:10]
    return [
        AnalyticsTopArticleResponse(
            id=item.id,
            topic=item.topic,
            title=item.title,
            status=item.publish_status,
            word_count=int(item.word_count or 0),
            readability_score=_round_score(item.readability_score),
            seo_score=_round_score(item.seo_score),
            engagement_score=_round_score(item.engagement_score),
            composite_score=_round_score(_composite_score(item)),
            published_at=item.published_at,
            created_at=item.created_at,
        )
        for item in sorted_content
    ]


def _as_utc(value: datetime | None) -> datetime | None:
    """Return a timezone-aware UTC datetime."""

    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _average(values: list[float | int | None]) -> float:
    """Return a rounded average while ignoring missing values."""

    numbers = [float(value) for value in values if value is not None]
    return _round_score(sum(numbers) / len(numbers)) if numbers else 0.0


def _composite_score(item: Content) -> float:
    """Calculate a simple quality composite from the three editor scores."""

    return (
        float(item.seo_score or 0)
        + float(item.readability_score or 0)
        + float(item.engagement_score or 0)
    ) / 3


def _round_score(value: float | int | None) -> float:
    """Round numeric score values consistently for the API."""

    return round(float(value or 0), 2)


def _clean_topic(topic: str | None) -> str:
    """Normalize empty topic strings for chart labels."""

    cleaned = (topic or "").strip()
    return cleaned or "Untitled topic"
