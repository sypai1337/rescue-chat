from pydantic import BaseModel
from datetime import datetime

class ServerCreate(BaseModel):
    name: str

class ServerResponse(BaseModel):
    id: int
    name: str
    icon_url: str | None = None
    owner_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class ServerJoin(BaseModel):
    server_id: int