"""Unit tests for application configuration."""

from app.core.config import Settings, get_settings


def test_settings_defaults() -> None:
    """Test default values for application settings."""
    settings = Settings()
    assert settings.app_name == "SecureLife Intelligent Lead Pipeline"
    assert settings.app_env == "development"
    assert settings.api_v1_prefix == "/api/v1"
    assert settings.database_url is not None


def test_get_settings_cached() -> None:
    """Test that get_settings returns the same cached instance."""
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2
