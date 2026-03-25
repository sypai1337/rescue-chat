from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.channel import Channel
from app.models.server import Server
from app.models.server_member import ServerMember
from app.models.user import User
from app.schemas.channel import ChannelCreate

async def _check_membership(server_id: int, user_id: int, db: AsyncSession) -> Server:
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")

    membership = await db.execute(
        select(ServerMember).where(
            ServerMember.server_id == server_id,
            ServerMember.user_id == user_id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")

    return server

async def create_channel(
    server_id: int, data: ChannelCreate, db: AsyncSession, user: User
) -> Channel:
    server = await _check_membership(server_id, user.id, db)
    if server.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owner")

    channel = Channel(name=data.name, type=data.type, server_id=server_id)
    db.add(channel)
    await db.commit()
    await db.refresh(channel)
    return channel

async def get_channels(server_id: int, db: AsyncSession, user: User) -> list[Channel]:
    await _check_membership(server_id, user.id, db)
    result = await db.execute(
        select(Channel).where(Channel.server_id == server_id)
    )
    return list(result.scalars().all())

async def delete_channel(channel_id: int, db: AsyncSession, user: User) -> None:
    result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")

    server = await db.execute(select(Server).where(Server.id == channel.server_id))
    server = server.scalar_one_or_none()
    if server.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owner")

    await db.delete(channel)
    await db.commit()