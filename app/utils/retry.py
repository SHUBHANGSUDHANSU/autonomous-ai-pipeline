"""Retry helpers for async external service calls."""

import asyncio
import functools
import random
from collections.abc import Awaitable, Callable
from typing import ParamSpec, TypeVar

P = ParamSpec("P")
T = TypeVar("T")


def async_retry(
    retries: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 30.0,
    retry_exceptions: tuple[type[BaseException], ...] = (Exception,),
) -> Callable[[Callable[P, Awaitable[T]]], Callable[P, Awaitable[T]]]:
    """Retry an async function with exponential backoff and jitter."""

    def decorator(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]:
        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            delay = initial_delay
            last_error: BaseException | None = None
            for attempt in range(1, retries + 1):
                try:
                    return await func(*args, **kwargs)
                except retry_exceptions as exc:
                    last_error = exc
                    if attempt == retries:
                        break
                    jitter = random.uniform(0, delay * 0.2)
                    await asyncio.sleep(min(delay + jitter, max_delay))
                    delay = min(delay * 2, max_delay)
            if last_error is not None:
                raise last_error
            raise RuntimeError("retry wrapper exited without result")

        return wrapper

    return decorator
