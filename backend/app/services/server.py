from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.server import Server
from app.models.server_member import ServerMember, MemberRole
from app.models.user import User
from app.models.channel import Channel
from app.schemas.server import ServerCreate
from app.websockets.manager import manager
import secrets
import os

async def create_server(data: ServerCreate, db: AsyncSession, owner: User) -> Server:
    server = Server(name=data.name, owner_id=owner.id)
    db.add(server)
    await db.flush()  # получаем id до commit

    # владелец автоматически становится участником
    member = ServerMember(user_id=owner.id, server_id=server.id, role=MemberRole.owner)
    db.add(member)
    await db.commit()
    await db.refresh(server)
    return server

async def get_user_servers(db: AsyncSession, user: User) -> list[Server]:
    result = await db.execute(
        select(Server)
        .join(ServerMember, Server.id == ServerMember.server_id)
        .where(ServerMember.user_id == user.id)
    )
    return list(result.scalars().all())

async def delete_server(server_id: int, db: AsyncSession, user: User) -> None:
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()

    if not server:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")
    if server.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owner")

    await db.delete(server)
    await db.commit()

async def create_invite(server_id: int, db: AsyncSession, user: User) -> str:
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")

    # проверяем что пользователь состоит в сервере
    membership = await db.execute(
        select(ServerMember).where(
            ServerMember.server_id == server_id,
            ServerMember.user_id == user.id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")

    return secrets.token_urlsafe(12)

async def join_server(invite_code: str, db: AsyncSession, user: User) -> Server:
    # декодируем server_id из инвайт кода
    # для простоты храним инвайты в Redis, но пока сделаем через подписанный токен
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Use join by server_id for now")

async def join_server_by_id(server_id: int, db: AsyncSession, user: User) -> Server:
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")

    existing = await db.execute(
        select(ServerMember).where(
            ServerMember.server_id == server_id,
            ServerMember.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already a member")

    member = ServerMember(user_id=user.id, server_id=server_id, role=MemberRole.member)
    db.add(member)
    await db.commit()
    return server

async def get_server_members(server_id: int, db: AsyncSession, current_user: User):
    result = await db.execute(
        select(User)
        .join(ServerMember, User.id == ServerMember.user_id)
        .where(ServerMember.server_id == server_id)
    )
    members = result.scalars().all()
    online = await manager.get_online_users(server_id)

    return [
        {
            "id": m.id,
            "username": m.username,
            "avatar_url": m.avatar_url,
            "online": m.id in online,
        }
        for m in members
    ]

async def leave_server(server_id: int, db: AsyncSession, user: User) -> None:
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")
    if server.owner_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Owner cannot leave. Delete the server instead."
        )

    membership = await db.execute(
        select(ServerMember).where(
            ServerMember.server_id == server_id,
            ServerMember.user_id == user.id,
        )
    )
    member = membership.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a member")

    await db.delete(member)
    await db.commit()

    # рассылаем событие user_left
    channel_ids_result = await db.execute(
        select(Channel.id).where(Channel.server_id == server_id)
    )
    channel_ids = list(channel_ids_result.scalars().all())
    await manager.broadcast_to_presence(
        {"type": "user_left", "user_id": user.id},
        server_id,
    )