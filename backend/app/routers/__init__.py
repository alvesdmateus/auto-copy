from app.routers.generate import router as generate_router
from app.routers.templates import router as templates_router
from app.routers.history import router as history_router

__all__ = ["generate_router", "templates_router", "history_router"]
