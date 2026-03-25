from fastapi import APIRouter
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.servers import router as servers_router
from app.api.v1.endpoints.channels import router as channels_router
from app.api.v1.endpoints.messages import router as messages_router

router = APIRouter(prefix="/api/v1")
router.include_router(auth_router)
router.include_router(servers_router)
router.include_router(channels_router)
router.include_router(messages_router)