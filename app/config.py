"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from `.env` and the process environment."""

    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    TAVILY_API_KEY: str
    REDIS_URL: str = "redis://localhost:6379"
    DATABASE_URL: str
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    LOG_LEVEL: str = "INFO"
    MAX_RESEARCH_SOURCES: int = Field(default=5, ge=1, le=20)
    CONTENT_PUBLISH_INTERVAL_HOURS: int = Field(default=6, ge=1)
    AUTO_CREATE_TABLES: bool = True
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return the cached settings singleton."""

    return Settings()


settings = get_settings()
