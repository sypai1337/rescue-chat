from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.server import ServerCreate, ServerResponse
from app.services.server import create_server, get_user_servers, delete_server

router = APIRouter(prefix="/servers", tags=["servers"])

@router.post("", response_model=ServerResponse, status_code=status.HTTP_201_CREATED)
async def create(
    data: ServerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await create_server(data, db, current_user)

@router.get("", response_model=list[ServerResponse])
async def list_servers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_user_servers(db, current_user)

@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await delete_server(server_id, db, current_user)