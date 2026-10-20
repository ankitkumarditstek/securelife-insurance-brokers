"""API Router definition for V1."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.auth import users_router
from app.api.v1.chat import router as chat_router
from app.api.v1.crm import dashboard_router, leads_router
from app.api.v1.documents import router as documents_router
from app.core.config import get_settings
from app.schemas.health import HealthCheckResponse

router = APIRouter()
settings = get_settings()


@router.get("/health", response_model=HealthCheckResponse, tags=["Health"])
def health_check() -> HealthCheckResponse:
    """Return application health status."""
    return HealthCheckResponse(
        status="ok",
        app_name=settings.app_name,
        environment=settings.app_env,
    )


# Mount Feature Routers
router.include_router(auth_router)
router.include_router(users_router)
router.include_router(chat_router)
router.include_router(leads_router)
router.include_router(dashboard_router)
router.include_router(documents_router)
