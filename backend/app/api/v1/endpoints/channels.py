from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.channel import ChannelCreate, ChannelResponse
from app.services.channel import create_channel, get_channels, delete_channel

router = APIRouter(tags=["channels"])

@router.post("/servers/{server_id}/channels", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED)
async def create(
    server_id: int,
    data: ChannelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await create_channel(server_id, data, db, current_user)

@router.get("/servers/{server_id}/channels", response_model=list[ChannelResponse])
async def list_channels(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_channels(server_id, db, current_user)

@router.delete("/channels/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await delete_channel(channel_id, db, current_user)