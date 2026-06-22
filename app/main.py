"""FastAPI application entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import Response
from starlette.types import Scope

from app.api.routes import analytics, content, health, pipeline
from app.config import settings
from app.db.session import init_db
from app.utils.logger import configure_logging

STATIC_DIR = Path(__file__).resolve().parent / "static"


class DashboardStaticFiles(StaticFiles):
    """Serve frontend assets without browser cache surprises during local rebuilds."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        """Return static assets and fall back from old hashed Vite names."""

        try:
            response = await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            fallback = self._fallback_asset(path)
            if exc.status_code != 404 or fallback is None:
                raise
            response = await super().get_response(fallback, scope)

        response.headers["Cache-Control"] = "no-store, max-age=0"
        return response

    @staticmethod
    def _fallback_asset(path: str) -> str | None:
        """Map stale hashed Vite asset requests to the current stable asset names."""

        if not path.startswith("assets/index-"):
            return None
        if path.endswith(".js"):
            return "assets/app.js"
        if path.endswith(".css"):
            return "assets/index.css"
        return None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize application resources."""

    configure_logging(settings.LOG_LEVEL)
    if settings.AUTO_CREATE_TABLES and settings.ENVIRONMENT != "test":
        await init_db()
    yield


app = FastAPI(
    title="Autonomous Agentic AI Content Pipeline",
    description="Autonomous multi-agent research, writing, editing, and publishing engine.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(pipeline.router)
app.include_router(content.router)
app.include_router(analytics.router)
app.mount("/static", DashboardStaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    """Redirect browsers to the React dashboard."""

    return RedirectResponse(url="/app")


@app.get("/app", include_in_schema=False)
@app.get("/app/{full_path:path}", include_in_schema=False)
async def frontend(full_path: str = "") -> FileResponse:
    """Serve the interactive React content pipeline dashboard."""

    response = FileResponse(STATIC_DIR / "index.html")
    response.headers["Cache-Control"] = "no-store, max-age=0"
    return response
