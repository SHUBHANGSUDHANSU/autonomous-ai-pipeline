"""Health check API route."""

import asyncio

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import get_db_session
from app.config import settings
from app.tasks.celery_tasks import celery_app
from app.tools.memory_tool import RedisMemory

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    redis: bool
    db: bool
    celery: bool


@router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db_session)) -> HealthResponse:
    """Return liveness for API dependencies."""

    redis_ok = await _check_redis()
    db_ok = await _check_db(db)
    celery_ok = await _check_celery()
    overall = "ok" if redis_ok and db_ok and celery_ok else "degraded"
    return HealthResponse(status=overall, redis=redis_ok, db=db_ok, celery=celery_ok)


async def _check_redis() -> bool:
    """Return true when Redis responds to ping."""

    memory = RedisMemory(settings.REDIS_URL)
    try:
        return bool(await memory.client.ping())
    except RedisError:
        return False
    finally:
        await memory.close()


async def _check_db(db: AsyncSession) -> bool:
    """Return true when PostgreSQL responds to a trivial query."""

    try:
        await db.execute(text("SELECT 1"))
        return True
    except SQLAlchemyError:
        return False


async def _check_celery() -> bool:
    """Return true when at least one Celery worker answers ping."""

    def inspect_workers() -> dict | None:
        inspector = celery_app.control.inspect(timeout=1.0)
        return inspector.ping()

    try:
        response = await asyncio.to_thread(inspect_workers)
        return bool(response)
    except Exception:
        return False
