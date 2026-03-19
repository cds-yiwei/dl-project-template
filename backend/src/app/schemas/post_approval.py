from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from ..core.schemas import PersistentDeletion, TimestampSchema, UUIDSchema


class PostApprovalCreateInternal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    post_id: int
    submitted_by_user_id: int
    reviewed_by_user_id: int | None = None
    from_status: Annotated[str, Field(max_length=32)]
    to_status: Annotated[str, Field(max_length=32)]
    decision: Annotated[str, Field(max_length=32)]
    comment: Annotated[str | None, Field(max_length=500, default=None)]


class PostApprovalRead(TimestampSchema, UUIDSchema, PersistentDeletion):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    submitted_by_user_id: int
    reviewed_by_user_id: int | None = None
    from_status: str
    to_status: str
    decision: str
    comment: str | None = None


class PostApprovalUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reviewed_by_user_id: int | None = None
    to_status: Annotated[str | None, Field(max_length=32, default=None)]
    decision: Annotated[str | None, Field(max_length=32, default=None)]
    comment: Annotated[str | None, Field(max_length=500, default=None)]


class PostApprovalUpdateInternal(PostApprovalUpdate):
    updated_at: datetime


class PostApprovalDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_deleted: bool
    deleted_at: datetime