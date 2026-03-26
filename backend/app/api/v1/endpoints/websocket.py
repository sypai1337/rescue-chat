from fastapi import APIRouter, WebSocket, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.websockets.handler import handle_websocket

router = APIRouter()

@router.websocket("/ws/{channel_id}")
async def websocket_endpoint(
    channel_id: int,
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
):
    await handle_websocket(websocket, channel_id, db)