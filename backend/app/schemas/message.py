from pydantic import BaseModel
from datetime import datetime

class MessageResponse(BaseModel):
    id: int
    content: str
    author_id: int
    channel_id: int
    created_at: datetime
    author: "UserResponse"

    model_config = {"from_attributes": True}

from app.schemas.user import UserResponse
MessageResponse.model_rebuild()