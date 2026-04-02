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
    user_id = user.id
    channel_result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = channel_result.scalar_one_or_none()
    if not channel:
        await websocket.accept()
        await websocket.close(code=4003)
        return

    membership = await db.execute(
        select(ServerMember).where(
            ServerMember.server_id == channel.server_id,
            ServerMember.user_id == user_id,
        )
    )
    if not membership.scalar_one_or_none():
        await websocket.accept()
        await websocket.close(code=4003)
        return

    await db.close()
    await manager.connect(websocket, channel_id, channel.server_id, user_id)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "message":
                await handle_chat_message(data, channel_id, user_id)
            elif msg_type == "join_voice":
                await handle_join_voice(channel_id, user_id)
            elif msg_type == "leave_voice":
                await handle_leave_voice(channel_id, user_id)
            elif msg_type in ("offer", "answer", "ice_candidate"):
                await handle_signal(data, user_id)
        
    except WebSocketDisconnect:
        await handle_disconnect(websocket, channel_id, channel.server_id, user_id)

async def handle_chat_message(data, channel_id: int, user_id: int):
    content = data.get("content", "").strip()
    if not content:
        return

    async with AsyncSessionLocal() as session:
        message = Message(
            content=content,
            author_id=user_id,
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

async def handle_join_voice(channel_id: int, user_id: int):
    manager.voice_participants[channel_id].append(user_id)
    # отправляем новому участнику список тех кто уже в канале
    await manager.send_to_user(user_id, {
        "type": "voice_participants",
        "user_ids": manager.voice_participants[channel_id]
    })
    # остальным участникам сообщаем что кто-то вошёл
    for uid in manager.voice_participants[channel_id]:
        if uid != user_id:
            await manager.send_to_user(uid, {
                "type": "user_joined_voice",
                "user_id": user_id
            })

async def handle_leave_voice(channel_id: int, user_id: int):
    if user_id in manager.voice_participants[channel_id]:
        manager.voice_participants[channel_id].remove(user_id)
    for uid in manager.voice_participants[channel_id]:
        await manager.send_to_user(uid, {
            "type": "user_left_voice",
            "user_id": user_id
        })

async def handle_signal(data, user_id: int):
    await manager.send_to_user(data["to"], {
        **data,
        "from": user_id
    })

async def handle_disconnect(websocket: WebSocket, channel_id: int, server_id: int, user_id: int):
    await handle_leave_voice(channel_id, user_id)
    await manager.disconnect_async(websocket, channel_id, server_id, user_id)

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

    await db.close()
    await websocket.accept()
    await manager.add_presence(websocket, server_id, user.id)
    await manager._ensure_listener(f"presence:{server_id}")

    await manager.broadcast_to_presence(
        {"type": "user_online", "user_id": user.id},
        server_id,
    )

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        async with AsyncSessionLocal() as session:
            membership = await session.execute(
                select(ServerMember).where(
                    ServerMember.server_id == server_id,
                    ServerMember.user_id == user.id,
                )
            )
            if membership.scalar_one_or_none():
                await manager.broadcast_to_presence(
                    {"type": "user_offline", "user_id": user.id},
                    server_id,
                )
        await manager.remove_presence(websocket, server_id, user.id)