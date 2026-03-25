from sqlalchemy import ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base

class MemberRole(str, enum.Enum):
    owner = "owner"
    member = "member"

class ServerMember(Base):
    __tablename__ = "server_members"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    server_id: Mapped[int] = mapped_column(ForeignKey("servers.id"), primary_key=True)
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole), default=MemberRole.member, nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="memberships")
    server: Mapped["Server"] = relationship(back_populates="members")