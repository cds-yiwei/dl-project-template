import uuid as uuid_pkg
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field, field_serializer, ConfigDict
from pydantic.alias_generators import to_camel

from typing import Callable
from uuid6 import uuid7


class HealthCheck(BaseModel):
    status: str
    environment: str
    version: str
    timestamp: str


class ReadyCheck(BaseModel):
    status: str
    environment: str
    version: str
    app: str
    database: str
    redis: str
    timestamp: str


# -------------- mixins --------------
class UUIDSchema(BaseModel):
    uuid: uuid_pkg.UUID = Field(default_factory=uuid7)


class TimestampSchema(BaseModel):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None), alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")

    @field_serializer("created_at")
    def serialize_dt(self, created_at: datetime | None, _info: Any) -> str | None:
        if created_at is not None:
            return created_at.isoformat()

        return None

    @field_serializer("updated_at")
    def serialize_updated_at(self, updated_at: datetime | None, _info: Any) -> str | None:
        if updated_at is not None:
            return updated_at.isoformat()

        return None


class PersistentDeletion(BaseModel):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    
    deleted_at: datetime | None = Field(default=None, alias="deletedAt")
    is_deleted: bool = Field(default=False, alias="isDeleted")

    @field_serializer("deleted_at")
    def serialize_dates(self, deleted_at: datetime | None, _info: Any) -> str | None:
        if deleted_at is not None:
            return deleted_at.isoformat()

        return None


# -------------- token --------------
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    subject: str


class TokenBlacklistBase(BaseModel):
    token: str
    expires_at: datetime


class TokenBlacklistRead(TokenBlacklistBase):
    id: int


class TokenBlacklistCreate(TokenBlacklistBase):
    pass


class TokenBlacklistUpdate(TokenBlacklistBase):
    pass
