from fastapi import APIRouter, WebSocket, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db, AsyncSessionLocal
from app.websockets.handler import handle_websocket, handle_presence

router = APIRouter()

@router.websocket("/ws/{channel_id}")
async def websocket_endpoint(
    channel_id: int,
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
):
    await handle_websocket(websocket, channel_id, db)

@router.websocket("/ws/presence/{server_id}")
async def presence_endpoint(
    server_id: int,
    websocket: WebSocket,
):
    # создаём сессию только для проверки, потом закрываем
    async with AsyncSessionLocal() as db:
        await handle_presence(websocket, server_id, db)