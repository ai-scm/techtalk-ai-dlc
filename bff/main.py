from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from client.backend_client import backend_client
from routers import auth, users, pets, requests


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - client is already initialized as singleton
    yield
    # Shutdown - close the backend client
    await backend_client.close()


app = FastAPI(title="Dog Keeper BFF", lifespan=lifespan)

# CORS middleware - allow all origins for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(pets.router)
app.include_router(requests.router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
