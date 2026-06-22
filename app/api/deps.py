"""FastAPI dependency providers."""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Yield the request-scoped database session."""

    async for session in get_session():
        yield session
