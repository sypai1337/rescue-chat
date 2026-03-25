from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.message import MessageResponse
from app.services.message import get_messages

router = APIRouter(tags=["messages"])

@router.get("/channels/{channel_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    channel_id: int,
    before_id: int | None = Query(None),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_messages(channel_id, db, current_user, before_id, limit)