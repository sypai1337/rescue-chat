from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.message import Message
from app.models.server_member import ServerMember
from app.models.channel import Channel
from app.models.user import User

async def get_messages(
    channel_id: int,
    db: AsyncSession,
    user: User,
    before_id: int | None = None,
    limit: int = 50,
) -> list[Message]:
    # проверяем что пользователь состоит в сервере этого канала
    channel_result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = channel_result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")

    membership = await db.execute(
        select(ServerMember).where(
            ServerMember.server_id == channel.server_id,
            ServerMember.user_id == user.id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")

    query = (
        select(Message)
        .where(Message.channel_id == channel_id)
        .options(selectinload(Message.author))  # подгружаем автора одним запросом
        .order_by(Message.id.desc())
        .limit(limit)
    )
    if before_id:
        query = query.where(Message.id < before_id)

    result = await db.execute(query)
    return list(reversed(result.scalars().all()))  # возвращаем в хронологическом порядке