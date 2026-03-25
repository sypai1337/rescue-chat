from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.server import Server
from app.models.server_member import ServerMember, MemberRole
from app.models.user import User
from app.schemas.server import ServerCreate

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