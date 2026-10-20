"""Application settings and environment configuration."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """SecureLife application configuration settings."""

    app_name: str = "SecureLife Intelligent Lead Pipeline"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    # Database configuration
    database_url: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/securelife"
    )

    # LLM Configuration
    llm_provider: str = "groq"  # "groq", "openai", "mock"
    llm_api_key: str = ""
    groq_api_key: str = ""
    openai_api_key: str = ""
    llm_chat_model: str = "llama-3.3-70b-versatile"

    # Document Processing & Storage
    storage_dir: str = "uploads"
    max_upload_size_bytes: int = 20 * 1024 * 1024  # 20 MB
    max_files_per_upload: int = 5
    max_pdf_pages: int = 50

    # Business Rules
    qualification_threshold: int = 50
    session_expiry_days: int = 7
    jwt_secret: str = "securelife-dev-secret-key-change-in-prod"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings instance."""
    return Settings()
