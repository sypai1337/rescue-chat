from pydantic import BaseModel
from datetime import datetime
from app.models.channel import ChannelType

class ChannelCreate(BaseModel):
    name: str
    type: ChannelType = ChannelType.text

class ChannelResponse(BaseModel):
    id: int
    name: str
    type: ChannelType
    server_id: int
    created_at: datetime

    model_config = {"from_attributes": True}