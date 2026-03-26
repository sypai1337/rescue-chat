from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class ChannelType(str, enum.Enum):
    text = "text"
    voice = "voice"

class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[ChannelType] = mapped_column(
        Enum(ChannelType), default=ChannelType.text, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    server_id: Mapped[int] = mapped_column(ForeignKey("servers.id"), nullable=False)

    # Relationships
    server: Mapped["Server"] = relationship(back_populates="channels")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="channel",
        cascade="all, delete-orphan"
    )