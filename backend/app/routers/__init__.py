from app.routers.generate import router as generate_router
from app.routers.templates import router as templates_router
from app.routers.history import router as history_router
from app.routers.brand import router as brand_router
from app.routers.workspace import router as workspace_router
from app.routers.content import router as content_router
from app.routers.analytics import router as analytics_router

__all__ = ["generate_router", "templates_router", "history_router", "brand_router", "workspace_router", "content_router", "analytics_router"]
