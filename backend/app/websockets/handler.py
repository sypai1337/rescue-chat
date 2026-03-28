from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.websockets.manager import manager
from app.core.security import decode_token
from app.core.database import get_db, AsyncSessionLocal
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

async def get_server_channel_ids(server_id: int, db: AsyncSession) -> list[int]:
    result = await db.execute(
        select(Channel.id).where(Channel.server_id == server_id)
    )
    return list(result.scalars().all())

async def handle_websocket(websocket: WebSocket, channel_id: int, db: AsyncSession):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.accept()
        await websocket.close(code=4001)
        return

    user = await get_user_from_token(token, db)
    if not user:
        await websocket.accept()
        await websocket.close(code=4001)
        return

    channel_result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = channel_result.scalar_one_or_none()
    if not channel:
        await websocket.accept()
        await websocket.close(code=4003)
        return

    membership = await db.execute(
        select(ServerMember).where(
            ServerMember.server_id == channel.server_id,
            ServerMember.user_id == user.id,
        )
    )
    if not membership.scalar_one_or_none():
        await websocket.accept()
        await websocket.close(code=4003)
        return

    await db.close()
    await manager.connect(websocket, channel_id, channel.server_id, user.id)

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") != "message":
                continue
            content = data.get("content", "").strip()
            if not content:
                continue

            async with AsyncSessionLocal() as session:
                message = Message(
                    content=content,
                    author_id=user.id,
                    channel_id=channel_id,
                )
                session.add(message)
                await session.commit()

                result = await session.execute(
                    select(Message)
                    .where(Message.id == message.id)
                    .options(selectinload(Message.author))
                )
                message = result.scalar_one()

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
        manager.disconnect(websocket, channel_id, channel.server_id, user.id)
    
async def handle_presence(websocket: WebSocket, server_id: int, db: AsyncSession):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.accept()
        await websocket.close(code=4001)
        return

    user = await get_user_from_token(token, db)
    if not user:
        await websocket.accept()
        await websocket.close(code=4001)
        return

    membership = await db.execute(
        select(ServerMember).where(
            ServerMember.server_id == server_id,
            ServerMember.user_id == user.id,
        )
    )
    if not membership.scalar_one_or_none():
        await websocket.accept()
        await websocket.close(code=4003)
        return

    # закрываем сессию БД — она больше не нужна
    await db.close()

    await websocket.accept()
    manager.add_presence(websocket, server_id, user.id)

    async with AsyncSessionLocal() as session:
        channel_ids = await get_server_channel_ids(server_id, session)

    await manager.broadcast_to_presence(
        {"type": "user_online", "user_id": user.id},
        server_id,
        channel_ids,
    )

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.remove_presence(websocket, server_id, user.id)
        
        # проверяем что пользователь ещё состоит в сервере
        async with AsyncSessionLocal() as session:
            membership = await session.execute(
                select(ServerMember).where(
                    ServerMember.server_id == server_id,
                    ServerMember.user_id == user.id,
                )
            )
            if membership.scalar_one_or_none():
                # только если ещё состоит — рассылаем offline
                channel_ids = await get_server_channel_ids(server_id, session)
                await manager.broadcast_to_presence(
                    {"type": "user_offline", "user_id": user.id},
                    server_id,
                    channel_ids,
                )