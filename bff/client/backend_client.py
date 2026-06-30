from __future__ import annotations

from typing import Any

import httpx

from core.config import settings


class BackendClient:
    """Async HTTP client wrapper for communicating with the backend API."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.BACKEND_URL,
            timeout=30.0,
        )

    async def forward_request(
        self,
        method: str,
        path: str,
        headers: dict[str, str] | None = None,
        params: dict[str, Any] | None = None,
        json: Any | None = None,
        content: bytes | None = None,
        files: Any | None = None,
    ) -> httpx.Response:
        """Forward a request to the backend service."""
        request_headers = {}
        if headers:
            for k, v in headers.items():
                if k.lower() == "authorization":
                    request_headers["Authorization"] = v
                    break

        response = await self._client.request(
            method=method,
            url=path,
            headers=request_headers,
            params=params,
            json=json,
            content=content,
            files=files,
        )
        return response

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()


backend_client = BackendClient()


async def get_backend_client() -> BackendClient:
    """FastAPI dependency that returns the backend client singleton."""
    return backend_client
