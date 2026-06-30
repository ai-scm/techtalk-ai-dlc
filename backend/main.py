"""FastAPI application entry point."""

from fastapi import FastAPI

from core.config import settings
from core.database import Base, SessionLocal, engine
from core.exceptions import exception_handlers
from routers import pets, requests, users
from seed import seed_database

app = FastAPI(title=settings.APP_NAME)

# Register custom exception handlers
for exc_class, handler in exception_handlers.items():
    app.add_exception_handler(exc_class, handler)

# Include routers
app.include_router(users.router)
app.include_router(pets.router)
app.include_router(requests.router)


@app.on_event("startup")
def on_startup() -> None:
    """Create database tables and seed initial data on startup."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


@app.get("/health")
def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok"}
