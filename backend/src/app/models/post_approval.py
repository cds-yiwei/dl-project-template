from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class PostApproval(Base):
    __tablename__ = "post_approval"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    post_id: Mapped[int] = mapped_column(ForeignKey("post.id"), index=True)
    submitted_by_user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True)
    from_status: Mapped[str] = mapped_column(String(32))
    to_status: Mapped[str] = mapped_column(String(32))
    decision: Mapped[str] = mapped_column(String(32))
    reviewed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), default=None, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=lambda: datetime.now(UTC))