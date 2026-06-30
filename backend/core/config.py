"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    DATABASE_URL: str = "postgresql://postgres:password@db:5432/dog_keeper_db"
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_EXPIRATION_HOURS: int = 24
    APP_NAME: str = "Dog Keeper API"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
