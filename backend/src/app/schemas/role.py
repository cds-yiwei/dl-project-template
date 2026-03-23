import uuid as uuid_pkg
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from ..core.schemas import PersistentDeletion, TimestampSchema


class RoleBase(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=64, examples=["admin"])]
    description: Annotated[str | None, Field(max_length=255, default=None, examples=["Administrator role"])]


class Role(TimestampSchema, RoleBase, PersistentDeletion):
    pass


class RoleRead(RoleBase):
    id: int
    uuid: uuid_pkg.UUID
    created_at: datetime


class RoleCreate(RoleBase):
    model_config = ConfigDict(extra="forbid")


class RoleCreateInternal(RoleCreate):
    pass


class RoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Annotated[str | None, Field(min_length=2, max_length=64, default=None)]
    description: Annotated[str | None, Field(max_length=255, default=None)]


class RoleUpdateInternal(RoleUpdate):
    updated_at: datetime


class RoleDelete(BaseModel):
    is_deleted: bool
    deleted_at: datetime