"""URL content extraction tool."""

import re

import httpx
from bs4 import BeautifulSoup

from app.utils.logger import get_logger


class ScrapeTool:
    """Fetch and clean readable text from a web page."""

    def __init__(self, timeout_seconds: float = 10.0, max_chars: int = 3000) -> None:
        """Create a scraper with timeout and output length limits."""

        self.timeout_seconds = timeout_seconds
        self.max_chars = max_chars
        self.logger = get_logger("scrape_tool")

    async def scrape(self, url: str) -> str:
        """Return cleaned page text, or an empty string when scraping fails."""

        try:
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=httpx.Timeout(self.timeout_seconds),
                headers={"User-Agent": "autonomous-ai-pipeline/0.1"},
            ) as client:
                response = await client.get(url)
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            self.logger.warning("scrape_timeout", url=url, error=str(exc))
            return ""
        except httpx.HTTPStatusError as exc:
            self.logger.warning(
                "scrape_http_status",
                url=url,
                status_code=exc.response.status_code,
                error=str(exc),
            )
            return ""
        except httpx.RequestError as exc:
            self.logger.warning("scrape_request_failed", url=url, error=str(exc))
            return ""

        soup = BeautifulSoup(response.text, "html.parser")
        for element in soup(
            ["script", "style", "nav", "footer", "header", "aside", "form", "noscript"]
        ):
            element.decompose()

        main = soup.find("main") or soup.find("article") or soup.body or soup
        text = main.get_text(separator=" ", strip=True)
        cleaned = re.sub(r"\s+", " ", text).strip()
        return cleaned[: self.max_chars]
