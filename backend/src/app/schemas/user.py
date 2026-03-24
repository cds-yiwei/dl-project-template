import uuid as uuid_pkg
from datetime import datetime
from typing import Annotated

from pydantic import ConfigDict, EmailStr, Field, BaseModel
from pydantic.alias_generators import to_camel


from ..core.schemas import PersistentDeletion, TimestampSchema, UUIDSchema
from ..schemas.department import DepartmentRead
from ..schemas.rate_limit import RateLimitRead


class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=30, examples=["User Userson"])
    username: str = Field(..., min_length=2, max_length=20, pattern=r"^[a-z0-9]+$", examples=["userson"])
    email: EmailStr = Field(..., examples=["user.userson@example.com"]) 


class User(TimestampSchema, UserBase, UUIDSchema, PersistentDeletion):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    
    profile_image_url: str = Field(default="https://www.profileimageurl.com", alias="profileImageUrl")
    hashed_password: str | None = None
    auth_provider: str | None = Field(None, alias="authProvider")
    auth_subject: str | None = Field(None, alias="authSubject")
    is_superuser: bool = False
    department_id: int | None = Field(None, alias="departmentId")
    role_id: int | None = Field(None, alias="roleId")
    tier_id: int | None = Field(None, alias="tierId")


class UserRead(UserBase):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    
    uuid: uuid_pkg.UUID
    department_abbreviation: str | None = Field(None, alias="departmentAbbreviation")
    department_uuid: uuid_pkg.UUID | None = Field(None, alias="departmentUuid")
    role_uuid: uuid_pkg.UUID | None = Field(None, alias="roleUuid")
    tier_uuid: uuid_pkg.UUID | None = Field(None, alias="tierUuid")

    name: str = Field(..., min_length=2, max_length=30, examples=["User Userson"])
    username: str = Field(..., min_length=2, max_length=20, pattern=r"^[a-z0-9]+$", examples=["userson"])
    email: EmailStr = Field(..., examples=["user.userson@example.com"])
    profile_image_url: str = Field(alias="profileImageUrl")
    auth_provider: str | None = Field(None, alias="authProvider")
    auth_subject: str | None = Field(None, alias="authSubject")


class UserReadInternal(UserRead):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    
    id: int
    department_id: int | None = Field(None, alias="departmentId")
    role_id: int | None = Field(None, alias="roleId")
    tier_id: int | None = Field(None, alias="tierId")


class UserTierRead(UserRead):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    tier_name: str
    tier_created_at: datetime = Field(alias="tierCreatedAt")


class UserDepartmentRead(UserRead):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    
    department_abbreviation_fr: str | None = Field(None, alias="departmentAbbreviationFr")
    department_name: str
    department_created_at: datetime = Field(alias="departmentCreatedAt")


class UserRateLimitsRead(UserRead):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    
    tier_rate_limits: list[RateLimitRead] = Field(alias="tierRateLimits")


class UserCreate(UserBase):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    password: str = Field(..., pattern=r"^.{8,}|[0-9]+|[A-Z]+|[a-z]+|[^a-zA-Z0-9]+$", examples=["Str1ngst!"])


class UserCreateInternal(UserBase):
    hashed_password: str | None = None
    auth_provider: str | None = None
    auth_subject: str | None = None


class UserUpdate(UserBase):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    name: str | None = Field(None, min_length=2, max_length=30, examples=["User Userberg"])
    username: str | None = Field(None, min_length=2, max_length=20, pattern=r"^[a-z0-9]+$", examples=["userberg"])
    email: EmailStr | None = Field(None, examples=["user.userberg@example.com"])
    profile_image_url: str | None = Field(None, pattern=r"^(https?|ftp)://[^\s/$.?#].[^\s]*$", examples=["https://www.profileimageurl.com"], alias="profileImageUrl")
    auth_provider: str | None = Field(None, max_length=50, alias="authProvider")
    auth_subject: str | None = Field(None, max_length=255, alias="authSubject")


class UserUpdateInternal(UserUpdate):
    updated_at: datetime


class UserRoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    role_uuid: uuid_pkg.UUID | None = Field(None, alias="roleUuid")


class UserTierUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    tier_uuid: uuid_pkg.UUID = Field(alias="tierUuid")


class UserDepartmentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    department_abbreviation: str | None = Field(None, min_length=2, max_length=16, alias="departmentAbbreviation")


class UserDelete(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    is_deleted: bool = Field(alias="isDeleted")
    deleted_at: datetime = Field(alias="deletedAt")


class UserRestoreDeleted(BaseModel):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    is_deleted: bool = Field(alias="isDeleted")
