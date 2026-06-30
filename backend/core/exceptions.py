"""Custom application exceptions and FastAPI exception handlers."""

from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base application error."""

    def __init__(self, detail: str, status_code: int = 500) -> None:
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class NotFoundError(AppError):
    """Resource not found (404)."""

    def __init__(self, detail: str = "Resource not found") -> None:
        super().__init__(detail=detail, status_code=404)


class ForbiddenError(AppError):
    """Access forbidden (403)."""

    def __init__(self, detail: str = "Forbidden") -> None:
        super().__init__(detail=detail, status_code=403)


class ValidationError(AppError):
    """Validation error (422)."""

    def __init__(self, detail: str = "Validation error") -> None:
        super().__init__(detail=detail, status_code=422)


class ConflictError(AppError):
    """Resource conflict (409)."""

    def __init__(self, detail: str = "Conflict") -> None:
        super().__init__(detail=detail, status_code=409)


class AuthenticationError(AppError):
    """Authentication failed (401)."""

    def __init__(self, detail: str = "Authentication failed") -> None:
        super().__init__(detail=detail, status_code=401)


async def _app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Generic handler for all AppError subclasses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


exception_handlers: dict[type[Exception], object] = {
    NotFoundError: _app_error_handler,
    ForbiddenError: _app_error_handler,
    ValidationError: _app_error_handler,
    ConflictError: _app_error_handler,
    AuthenticationError: _app_error_handler,
}
