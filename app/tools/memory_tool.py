"""Async Redis memory wrapper for agent short-term state."""

from typing import Any

import redis.asyncio as redis
from redis.exceptions import RedisError

from app.config import settings
from app.utils.logger import get_logger


class RedisMemory:
    """Thin async Redis wrapper for saving and reading transient memory."""

    def __init__(self, redis_url: str | None = None) -> None:
        """Create a Redis memory client."""

        self.redis_url = redis_url or settings.REDIS_URL
        self.client = redis.from_url(self.redis_url, decode_responses=True)
        self.logger = get_logger("memory_tool")

    async def save(self, key: str, value: str, ttl_seconds: int = 3600) -> None:
        """Save a string value with a TTL."""

        try:
            await self.client.set(key, value, ex=ttl_seconds)
        except RedisError as exc:
            self.logger.error("redis_save_failed", key=key, error=str(exc))
            raise

    async def get(self, key: str) -> str | None:
        """Read a string value by key."""

        try:
            value: Any = await self.client.get(key)
            return value if isinstance(value, str) or value is None else str(value)
        except RedisError as exc:
            self.logger.error("redis_get_failed", key=key, error=str(exc))
            raise

    async def delete(self, key: str) -> None:
        """Delete a key from Redis."""

        try:
            await self.client.delete(key)
        except RedisError as exc:
            self.logger.error("redis_delete_failed", key=key, error=str(exc))
            raise

    async def close(self) -> None:
        """Close the Redis connection."""

        await self.client.aclose()
