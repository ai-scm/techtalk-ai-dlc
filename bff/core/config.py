from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class BFFSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    BACKEND_URL: str = "http://backend:8000"
    JWT_SECRET: str = "dev-secret-change-in-production"
    PORT: int = 8001


settings = BFFSettings()
