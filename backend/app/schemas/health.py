"""Health schema definitions."""

from pydantic import BaseModel


class HealthCheckResponse(BaseModel):
    """Response schema for health check endpoint."""

    status: str
    app_name: str
    environment: str
