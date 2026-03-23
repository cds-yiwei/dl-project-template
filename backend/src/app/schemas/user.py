import uuid as uuid_pkg
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from ..core.schemas import PersistentDeletion, TimestampSchema, UUIDSchema
from ..schemas.rate_limit import RateLimitRead


class UserBase(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=30, examples=["User Userson"])]
    username: Annotated[str, Field(min_length=2, max_length=20, pattern=r"^[a-z0-9]+$", examples=["userson"])]
    email: Annotated[EmailStr, Field(examples=["user.userson@example.com"])]


class User(TimestampSchema, UserBase, UUIDSchema, PersistentDeletion):
    profile_image_url: Annotated[str, Field(default="https://www.profileimageurl.com")]
    hashed_password: str | None = None
    auth_provider: str | None = None
    auth_subject: str | None = None
    is_superuser: bool = False
    role_id: int | None = None
    tier_id: int | None = None


class UserRead(BaseModel):
    uuid: uuid_pkg.UUID
    role_uuid: uuid_pkg.UUID | None = None
    tier_uuid: uuid_pkg.UUID | None = None

    name: Annotated[str, Field(min_length=2, max_length=30, examples=["User Userson"])]
    username: Annotated[str, Field(min_length=2, max_length=20, pattern=r"^[a-z0-9]+$", examples=["userson"])]
    email: Annotated[EmailStr, Field(examples=["user.userson@example.com"])]
    profile_image_url: str
    auth_provider: str | None = None
    auth_subject: str | None = None


class UserReadInternal(UserRead):
    id: int
    role_id: int | None = None
    tier_id: int | None = None


class UserTierRead(UserRead):
    tier_name: str
    tier_created_at: datetime


class UserRateLimitsRead(UserRead):
    tier_rate_limits: list[RateLimitRead]


class UserCreate(UserBase):
    model_config = ConfigDict(extra="forbid")

    password: Annotated[str, Field(pattern=r"^.{8,}|[0-9]+|[A-Z]+|[a-z]+|[^a-zA-Z0-9]+$", examples=["Str1ngst!"])]


class UserCreateInternal(UserBase):
    hashed_password: str | None = None
    auth_provider: str | None = None
    auth_subject: str | None = None


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Annotated[str | None, Field(min_length=2, max_length=30, examples=["User Userberg"], default=None)]
    username: Annotated[
        str | None, Field(min_length=2, max_length=20, pattern=r"^[a-z0-9]+$", examples=["userberg"], default=None)
    ]
    email: Annotated[EmailStr | None, Field(examples=["user.userberg@example.com"], default=None)]
    profile_image_url: Annotated[
        str | None,
        Field(
            pattern=r"^(https?|ftp)://[^\s/$.?#].[^\s]*$", examples=["https://www.profileimageurl.com"], default=None
        ),
    ]
    auth_provider: Annotated[str | None, Field(max_length=50, default=None)]
    auth_subject: Annotated[str | None, Field(max_length=255, default=None)]


class UserUpdateInternal(UserUpdate):
    updated_at: datetime


class UserRoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role_uuid: uuid_pkg.UUID | None = None


class UserTierUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tier_uuid: uuid_pkg.UUID


class UserDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_deleted: bool
    deleted_at: datetime


class UserRestoreDeleted(BaseModel):
    is_deleted: bool
