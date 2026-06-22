"""Async SQLAlchemy session management."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """Base class for SQLAlchemy ORM models."""


engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Yield an async database session for FastAPI dependencies."""

    async with async_session_factory() as session:
        yield session


@asynccontextmanager
async def get_session_context() -> AsyncIterator[AsyncSession]:
    """Return an async context manager for non-FastAPI database access."""

    async with async_session_factory() as session:
        yield session


async def init_db() -> None:
    """Create database tables for local and containerized development."""

    from app.models.content import Content  # noqa: F401
    from app.models.task import PipelineTask  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
