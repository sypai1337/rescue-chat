from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.websockets.manager import manager
from app.core.security import decode_token
from app.models.user import User
from app.models.message import Message
from app.models.channel import Channel
from app.models.server_member import ServerMember

async def get_user_from_token(token: str, db: AsyncSession) -> User | None:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == int(user_id)))
    return result.scalar_one_or_none()

async def check_channel_access(channel_id: int, user_id: int, db: AsyncSession) -> bool:
    channel = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = channel.scalar_one_or_none()
    if not channel:
        return False
    membership = await db.execute(
        select(ServerMember).where(
            ServerMember.server_id == channel.server_id,
            ServerMember.user_id == user_id,
        )
    )
    return membership.scalar_one_or_none() is not None

async def handle_websocket(websocket: WebSocket, channel_id: int, db: AsyncSession):
    # токен передаётся как query param: ws://.../{channel_id}?token=...
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    user = await get_user_from_token(token, db)
    if not user:
        await websocket.close(code=4001)
        return

    has_access = await check_channel_access(channel_id, user.id, db)
    if not has_access:
        await websocket.close(code=4003)
        return

    await manager.connect(websocket, channel_id)
    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") != "message":
                continue

            content = data.get("content", "").strip()
            if not content:
                continue

            # сохраняем в БД
            message = Message(
                content=content,
                author_id=user.id,
                channel_id=channel_id,
            )
            db.add(message)
            await db.commit()

            # подгружаем автора для ответа
            result = await db.execute(
                select(Message)
                .where(Message.id == message.id)
                .options(selectinload(Message.author))
            )
            message = result.scalar_one()

            # рассылаем всем в канале
            await manager.broadcast(
                {
                    "type": "message",
                    "id": message.id,
                    "content": message.content,
                    "channel_id": channel_id,
                    "author": {
                        "id": message.author.id,
                        "username": message.author.username,
                        "avatar_url": message.author.avatar_url,
                    },
                    "created_at": message.created_at.isoformat(),
                },
                channel_id,
            )

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel_id)